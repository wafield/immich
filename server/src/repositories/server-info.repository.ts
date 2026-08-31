import { Injectable } from '@nestjs/common';
import { exiftool } from 'exiftool-vendored';
import { exec as execCallback } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { ReleaseChannel } from 'src/enum';
import { ConfigRepository } from 'src/repositories/config.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';

export interface VersionResponse {
  version: string;
  published_at: string;
}

export interface ServerBuildVersions {
  nodejs: string;
  ffmpeg: string;
  libvips: string;
  exiftool: string;
  imagemagick: string;
}

const exec = promisify(execCallback);
const maybeFirstLine = async (command: string): Promise<string> => {
  try {
    const { stdout } = await exec(command, { timeout: 3000 });
    return stdout.trim().split('\n', 1)[0] || '';
  } catch {
    return '';
  }
};

type BuildLockfile = {
  sources: Array<{ name: string; version: string }>;
  packages: Array<{ name: string; version: string }>;
};

const getLockfileVersion = (name: string, lockfile?: BuildLockfile) => {
  if (!lockfile) {
    return;
  }

  const items = [...(lockfile.sources || []), ...(lockfile?.packages || [])];
  const item = items.find((item) => item.name === name);
  return item?.version;
};

@Injectable()
export class ServerInfoRepository {
  constructor(
    private configRepository: ConfigRepository,
    private logger: LoggingRepository,
  ) {
    this.logger.setContext(ServerInfoRepository.name);
  }

  async getLatestRelease(channel: ReleaseChannel): Promise<VersionResponse> {
    try {
      const { versionCheck } = this.configRepository.getEnv();
      const url = new URL(versionCheck.url);
      switch (channel) {
        case ReleaseChannel.Stable: {
          url.searchParams.append('channel', 'stable');
          break;
        }
        case ReleaseChannel.ReleaseCandidate: {
          url.searchParams.append('channel', 'rc');
          break;
        }
      }
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Version check request failed with status ${response.status}: ${await response.text()}`);
      }

      return response.json();
    } catch (error) {
      throw new Error('Failed to fetch latest release', { cause: error });
    }
  }

  buildVersions?: ServerBuildVersions;

  private async retrieveVersionFallback(
    command: string,
    commandTransform?: (output: string) => string,
    version?: string,
  ): Promise<string> {
    this.logger.debug(`retrieveVersionFallback: started for "${command}" (passed version: ${version || 'none'})`);
    if (!version) {
      this.logger.debug(`retrieveVersionFallback: executing command "${command}"...`);
      const output = await maybeFirstLine(command);
      this.logger.debug(`retrieveVersionFallback: command "${command}" raw output: "${output}"`);
      version = commandTransform ? commandTransform(output) : output;
      this.logger.debug(`retrieveVersionFallback: command "${command}" transformed version: "${version}"`);
    }
    this.logger.debug(`retrieveVersionFallback: completed for "${command}" with result "${version}"`);
    return version;
  }

  async getBuildVersions(): Promise<ServerBuildVersions> {
    this.logger.debug('getBuildVersions: started');
    if (!this.buildVersions) {
      const { nodeVersion, resourcePaths } = this.configRepository.getEnv();

      this.logger.debug(`getBuildVersions: reading lockfile at ${resourcePaths.lockFile}...`);
      const lockfile: BuildLockfile | undefined = await readFile(resourcePaths.lockFile)
        .then((buffer) => {
          this.logger.debug(`getBuildVersions: lockfile successfully read from ${resourcePaths.lockFile}`);
          return JSON.parse(buffer.toString());
        })
        .catch((err) => {
          this.logger.warn(`Failed to read ${resourcePaths.lockFile}: ${err?.message || err}`);
          return undefined;
        });

      this.logger.debug(`getBuildVersions: lockfile parsed (has content: ${!!lockfile})`);

      const checkNode = async () => {
        this.logger.debug('getBuildVersions: Node.js version check started');
        const v = nodeVersion || process.version;
        this.logger.debug(`getBuildVersions: Node.js version check completed -> "${v}"`);
        return v;
      };

      const checkFfmpeg = async () => {
        this.logger.debug('getBuildVersions: FFmpeg version check started');
        const v = await this.retrieveVersionFallback(
          'ffmpeg -version',
          (output) => output.replaceAll('ffmpeg version ', ''),
          getLockfileVersion('ffmpeg', lockfile),
        );
        this.logger.debug(`getBuildVersions: FFmpeg version check completed -> "${v}"`);
        return v;
      };

      const checkMagick = async () => {
        this.logger.debug('getBuildVersions: ImageMagick version check started');
        const v = await this.retrieveVersionFallback(
          'magick --version',
          (output) => output.replaceAll('Version: ImageMagick ', ''),
          getLockfileVersion('imagemagick', lockfile),
        );
        this.logger.debug(`getBuildVersions: ImageMagick version check completed -> "${v}"`);
        return v;
      };

      const checkExiftool = async () => {
        this.logger.debug('getBuildVersions: ExifTool version check started');
        const lockfileVersion = getLockfileVersion('exiftool', lockfile);
        if (lockfileVersion) {
          this.logger.debug(`getBuildVersions: ExifTool version found in lockfile -> "${lockfileVersion}"`);
          return lockfileVersion;
        }

        this.logger.debug('getBuildVersions: calling exiftool.version() with 3s timeout...');
        try {
          const v = await Promise.race([
            exiftool.version(),
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error('exiftool.version() timed out after 3000ms')), 3000),
            ),
          ]);
          this.logger.debug(`getBuildVersions: ExifTool version check completed -> "${v}"`);
          return v;
        } catch (err: any) {
          this.logger.warn(`getBuildVersions: exiftool.version() failed or timed out: ${err?.message || err}`);
          const fallback = await this.retrieveVersionFallback('exiftool -ver');
          this.logger.debug(`getBuildVersions: ExifTool fallback version -> "${fallback}"`);
          return fallback;
        }
      };

      this.logger.debug('getBuildVersions: running version checks concurrently...');
      const [nodejsVersion, ffmpegVersion, magickVersion, exiftoolVersion] = await Promise.all([
        checkNode(),
        checkFfmpeg(),
        checkMagick(),
        checkExiftool(),
      ]);
      this.logger.debug('getBuildVersions: concurrent version checks completed');

      this.logger.debug('getBuildVersions: resolving libvips version...');
      const libvipsVersion = getLockfileVersion('libvips', lockfile) || sharp.versions.vips;
      this.logger.debug(`getBuildVersions: libvips version resolved -> "${libvipsVersion}"`);

      this.buildVersions = {
        nodejs: nodejsVersion,
        exiftool: exiftoolVersion,
        ffmpeg: ffmpegVersion,
        libvips: libvipsVersion,
        imagemagick: magickVersion,
      };
      this.logger.debug(`getBuildVersions: finished resolving all build versions: ${JSON.stringify(this.buildVersions)}`);
    } else {
      this.logger.debug(`getBuildVersions: returning cached build versions: ${JSON.stringify(this.buildVersions)}`);
    }

    this.logger.debug('getBuildVersions: completed');
    return this.buildVersions;
  }
}
