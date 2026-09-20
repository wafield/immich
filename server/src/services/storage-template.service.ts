import { BadRequestException, Injectable } from '@nestjs/common';
import handlebar from 'handlebars';
import { DateTime } from 'luxon';
import path from 'node:path';
import sanitize from 'sanitize-filename';
import type { ArgOf } from 'src/repositories/event.repository.js';
import type { JobOf, StorageAsset } from 'src/types.js';
import { StorageCore } from 'src/cores/storage.core.js';
import { OnEvent, OnJob } from 'src/decorators.js';
import { AssetMoveResponseDto } from 'src/dtos/asset.dto.js';
import { ConfigTemplateStorageOptionDto } from 'src/dtos/config.dto.js';
import { mapNotification } from 'src/dtos/notification.dto.js';
import {
  AssetFileType,
  AssetPathType,
  AssetType,
  CronJob,
  DatabaseLock,
  JobName,
  JobStatus,
  NotificationLevel,
  NotificationType,
  QueueName,
  StorageFolder,
} from 'src/enum.js';
import { BaseService } from 'src/services/base.service.js';
import { getAssetFile, getAssetFiles } from 'src/utils/asset.util.js';
import { getFilenameExtension, getLivePhotoMotionFilename } from 'src/utils/file.js';
import { batched, handlePromiseError } from 'src/utils/misc.js';

const storageTokens = {
  secondOptions: ['s', 'ss', 'SSS'],
  minuteOptions: ['m', 'mm'],
  dayOptions: ['d', 'dd'],
  weekOptions: ['W', 'WW'],
  hourOptions: ['h', 'hh', 'H', 'HH'],
  yearOptions: ['y', 'yy'],
  monthOptions: ['M', 'MM', 'MMM', 'MMMM'],
};

const storagePresets = [
  '{{y}}/{{y}}-{{MM}}-{{dd}}/{{filename}}',
  '{{y}}/{{MM}}-{{dd}}/{{filename}}',
  '{{y}}/{{MMMM}}-{{dd}}/{{filename}}',
  '{{y}}/{{MM}}/{{filename}}',
  '{{y}}/{{#if album}}{{album}}{{else}}Other/{{MM}}{{/if}}/{{filename}}',
  '{{#if album}}{{album-startDate-y}}/{{album}}{{else}}{{y}}/Other/{{MM}}{{/if}}/{{filename}}',
  '{{y}}/{{MMM}}/{{filename}}',
  '{{y}}/{{MMMM}}/{{filename}}',
  '{{y}}/{{MM}}/{{dd}}/{{filename}}',
  '{{y}}/{{MMMM}}/{{dd}}/{{filename}}',
  '{{y}}/{{y}}-{{MM}}/{{y}}-{{MM}}-{{dd}}/{{filename}}',
  '{{y}}-{{MM}}-{{dd}}/{{filename}}',
  '{{y}}-{{MMM}}-{{dd}}/{{filename}}',
  '{{y}}-{{MMMM}}-{{dd}}/{{filename}}',
  '{{y}}/{{y}}-{{MM}}/{{filename}}',
  '{{y}}/{{y}}-{{WW}}/{{filename}}',
  '{{y}}/{{y}}-{{MM}}-{{dd}}/{{assetId}}',
  '{{y}}/{{y}}-{{MM}}/{{assetId}}',
  '{{y}}/{{y}}-{{WW}}/{{assetId}}',
  '{{album}}/{{filename}}',
  '{{make}}/{{model}}/{{lensModel}}/{{filename}}',
];

export interface MoveAssetMetadata {
  storageLabel: string | null;
  filename: string;
}

export interface MoveAssetToLibraryOptions {
  assetId: string;
  targetLibraryId: string | null;
  targetUploadPath?: string | null;
  storageLabel?: string | null;
  onDuplicate?: (asset: any, existingDuplicate: any) => Promise<void> | void;
}

interface RenderMetadata {
  asset: StorageAsset;
  filename: string;
  extension: string;
  albumName: string | null;
  albumStartDate: Date | null;
  albumEndDate: Date | null;
  make: string | null;
  model: string | null;
  lensModel: string | null;
}

@Injectable()
export class StorageTemplateService extends BaseService {
  private _template: {
    compiled: HandlebarsTemplateDelegate<any>;
    raw: string;
    needsAlbum: boolean;
    needsAlbumMetadata: boolean;
  } | null = null;

  private get template() {
    if (!this._template) {
      throw new Error('Template not initialized');
    }
    return this._template;
  }

  private dailyMoveLock = false;

  @OnEvent({ name: 'ConfigInit' })
  async onConfigInit({ newConfig }: ArgOf<'ConfigInit'>) {
    const template = newConfig.storageTemplate.template;
    if (!this._template || template !== this.template.raw) {
      this.logger.debug(`Compiling new storage template: ${template}`);
      this._template = this.compile(template);
    }

    if (!this.dailyMoveLock) {
      this.dailyMoveLock = await this.databaseRepository.tryLock(DatabaseLock.DailyAssetMove);
      if (this.dailyMoveLock) {
        this.logger.debug('Scheduling daily asset move job for 0 2 * * *');
        this.cronRepository.create({
          name: CronJob.DailyAssetMove,
          expression: '0 2 * * *',
          start: true,
          onTick: () => handlePromiseError(this.jobRepository.queue({ name: JobName.DailyAssetMove }), this.logger),
        });
      }
    }
  }

  @OnEvent({ name: 'ConfigUpdate', server: true })
  async onConfigUpdate({ newConfig }: ArgOf<'ConfigUpdate'>) {
    await this.onConfigInit({ newConfig });
  }

  @OnEvent({ name: 'ConfigValidate' })
  onConfigValidate({ newConfig }: ArgOf<'ConfigValidate'>) {
    try {
      const { compiled } = this.compile(newConfig.storageTemplate.template);
      this.render(compiled, {
        asset: {
          fileCreatedAt: new Date(),
          originalPath: '/upload/test/IMG_123.jpg',
          type: AssetType.Image,
          id: 'd587e44b-f8c0-4832-9ba3-43268bbf5d4e',
        } as StorageAsset,
        filename: 'IMG_123',
        extension: 'jpg',
        albumName: 'album',
        albumStartDate: new Date(),
        albumEndDate: new Date(),
        make: 'FUJIFILM',
        model: 'X-T50',
        lensModel: 'XF27mm F2.8 R WR',
      });
    } catch (error) {
      this.logger.warn(`Storage template validation failed: ${JSON.stringify(error)}`);
      throw new Error('Invalid storage template', { cause: error });
    }
  }

  getStorageTemplateOptions(): ConfigTemplateStorageOptionDto {
    return { ...storageTokens, presetOptions: storagePresets };
  }

  @OnEvent({ name: 'AssetMetadataExtracted' })
  async onAssetMetadataExtracted({ source, assetId }: ArgOf<'AssetMetadataExtracted'>) {
    await this.jobRepository.queue({ name: JobName.StorageTemplateMigrationSingle, data: { source, id: assetId } });
  }

  @OnJob({ name: JobName.StorageTemplateMigrationSingle, queue: QueueName.StorageTemplateMigration })
  async handleMigrationSingle({ id }: JobOf<JobName.StorageTemplateMigrationSingle>): Promise<JobStatus> {
    const config = await this.getConfig({ withCache: true });
    const isStorageTemplateEnabled = config.storageTemplate.enabled;
    if (!isStorageTemplateEnabled) {
      return JobStatus.Skipped;
    }

    const asset = await this.assetJobRepository.getForStorageTemplateJob(id);
    if (!asset) {
      return JobStatus.Failed;
    }

    const user = await this.userRepository.get(asset.ownerId, {});
    const storageLabel = user?.storageLabel || null;
    const filename = asset.originalFileName || asset.id;
    await this.moveAsset(asset, { storageLabel, filename });

    // move motion part of live photo
    if (asset.livePhotoVideoId) {
      const livePhotoVideo = await this.assetJobRepository.getForStorageTemplateJob(asset.livePhotoVideoId, {
        includeHidden: true,
      });
      if (!livePhotoVideo) {
        return JobStatus.Failed;
      }
      const motionFilename = getLivePhotoMotionFilename(filename, livePhotoVideo.originalPath);
      await this.moveAsset(livePhotoVideo, { storageLabel, filename: motionFilename }, asset);
    }
    return JobStatus.Success;
  }

  @OnJob({ name: JobName.StorageTemplateMigration, queue: QueueName.StorageTemplateMigration })
  async handleMigration(): Promise<JobStatus> {
    this.logger.log('Starting storage template migration');
    const { storageTemplate } = await this.getConfig({ withCache: true });
    const { enabled } = storageTemplate;
    if (!enabled) {
      this.logger.log('Storage template migration disabled, skipping');
      return JobStatus.Skipped;
    }

    await this.moveRepository.cleanMoveHistory();

    const assets = this.assetJobRepository.streamForStorageTemplateJob();
    const users = await this.userRepository.getList();

    for await (const asset of assets) {
      const user = users.find((user) => user.id === asset.ownerId);
      const storageLabel = user?.storageLabel || null;
      const filename = asset.originalFileName || asset.id;
      await this.moveAsset(asset, { storageLabel, filename });

      // move motion part of live photo
      if (asset.livePhotoVideoId) {
        const livePhotoVideo = await this.assetJobRepository.getForStorageTemplateJob(asset.livePhotoVideoId, {
          includeHidden: true,
        });
        if (livePhotoVideo) {
          const motionFilename = getLivePhotoMotionFilename(filename, livePhotoVideo.originalPath);
          await this.moveAsset(livePhotoVideo, { storageLabel, filename: motionFilename }, asset);
        }
      }
    }

    this.logger.debug('Cleaning up empty directories...');
    const libraryFolder = StorageCore.getBaseFolder(StorageFolder.Library);
    await this.storageRepository.removeEmptyDirs(libraryFolder);

    this.logger.log('Finished storage template migration');

    return JobStatus.Success;
  }

  @OnJob({ name: JobName.DailyAssetMove, queue: QueueName.DailyAssetMove })
  async handleDailyAssetMove(): Promise<JobStatus> {
    this.logger.log('Starting automated daily asset library move');
    const { storageTemplate } = await this.getConfig({ withCache: true });
    if (!storageTemplate.enabled) {
      this.logger.warn('Storage template is disabled in system settings, skipping daily asset move');
      return JobStatus.Skipped;
    }

    // Wait for any active or pending StorageTemplateMigration jobs to finish first
    while (true) {
      const counts = await this.jobRepository.getJobCounts(QueueName.StorageTemplateMigration);
      if (!counts || (counts.active === 0 && counts.waiting === 0)) {
        break;
      }
      this.logger.debug('Storage template migration tasks in progress, waiting before daily asset move...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const libraries = await this.libraryRepository.getDailyMoveLibraries();
    if (libraries.length === 0) {
      this.logger.debug('No external libraries configured for automated daily move');
      return JobStatus.Success;
    }

    for (const library of libraries) {
      try {
        const uploadPath = library.uploadPath;
        if (!uploadPath) {
          this.logger.warn(`Daily move target library "${library.name}" has no upload path configured, skipping`);
          continue;
        }

        if (!this.storageRepository.existsSync(uploadPath)) {
          this.logger.warn(
            `Daily move target upload path does not exist on disk: ${uploadPath}, skipping library "${library.name}"`,
          );
          continue;
        }

        const owner = await this.userRepository.get(library.ownerId, {});
        if (!owner) {
          this.logger.warn(`Owner for library "${library.name}" not found, skipping`);
          continue;
        }

        const storageLabel = owner.storageLabel || null;
        let movedCount = 0;
        let skippedDuplicateCount = 0;

        for await (const assetBatch of batched(
          this.assetRepository.streamDefaultLibraryAssetIds(library.ownerId),
          100,
        )) {
          for (const { id: assetId } of assetBatch) {
            try {
              const res = await this.moveAssetToLibrary({
                assetId,
                targetLibraryId: library.id,
                targetUploadPath: uploadPath,
                storageLabel,
                onDuplicate: async (asset) => {
                  skippedDuplicateCount++;
                  const title = 'Duplicate File Skipped';
                  const filename = asset.originalFileName || asset.id;
                  const description = `File "${filename}" was not moved to external library "${library.name}" because an identical asset already exists in the target library.`;
                  this.logger.warn(description);

                  const notification = await this.notificationRepository.create({
                    userId: asset.ownerId,
                    type: NotificationType.SystemMessage,
                    level: NotificationLevel.Warning,
                    title,
                    description,
                  });

                  this.websocketRepository.clientSend('on_notification', asset.ownerId, mapNotification(notification));
                },
              });

              if (res.success) {
                movedCount++;
              }
            } catch (assetError: any) {
              this.logger.error(
                `Failed to move asset ${assetId} during daily move: ${assetError.message}`,
                assetError.stack,
              );
            }
          }
        }

        // Clean up empty source directories in user's default library folder
        const defaultUserFolder = StorageCore.getLibraryFolder({ id: library.ownerId, storageLabel });
        await this.storageRepository.removeEmptyDirs(defaultUserFolder);

        this.logger.log(
          `Daily asset move completed for library "${library.name}": moved ${movedCount} asset(s), skipped ${skippedDuplicateCount} duplicate(s)`,
        );
      } catch (libraryError: any) {
        this.logger.error(
          `Error processing daily move for library ${library.id}: ${libraryError.message}`,
          libraryError.stack,
        );
      }
    }

    this.logger.log('Finished automated daily asset library move');
    return JobStatus.Success;
  }

  async moveAssetToLibrary({
    assetId,
    targetLibraryId,
    targetUploadPath,
    storageLabel,
    onDuplicate,
  }: MoveAssetToLibraryOptions): Promise<AssetMoveResponseDto> {
    const asset = await this.assetRepository.getById(assetId, {
      exifInfo: true,
      owner: true,
      files: true,
      library: true,
    });

    if (!asset) {
      return { id: assetId, success: false, error: 'Asset not found' };
    }

    if (asset.libraryId === targetLibraryId) {
      return { id: assetId, success: true };
    }

    if (StorageCore.isAndroidMotionPath(asset.originalPath)) {
      this.logger.debug(`Skipping standalone move of Android motion photo video: ${assetId}`);
      return { id: assetId, success: true };
    }

    // Check duplicate checksum collision in target library
    const existingDuplicate = await this.assetRepository.getByChecksum({
      ownerId: asset.ownerId,
      libraryId: targetLibraryId ?? undefined,
      checksum: asset.checksum,
    });

    if (existingDuplicate && existingDuplicate.id !== asset.id) {
      if (onDuplicate) {
        await onDuplicate(asset, existingDuplicate);
      }
      return {
        id: assetId,
        success: false,
        error: 'Asset checksum already exists in target library',
      };
    }

    if (storageLabel === undefined) {
      const ownerUser = await this.userRepository.get(asset.ownerId, {});
      storageLabel = ownerUser?.storageLabel || null;
    }

    const assetRootPath = targetUploadPath ?? StorageCore.getLibraryFolder({ id: asset.ownerId, storageLabel });
    const filename = asset.originalFileName || asset.id;

    const storageAsset: StorageAsset = {
      id: asset.id,
      ownerId: asset.ownerId,
      livePhotoVideoId: asset.livePhotoVideoId,
      type: asset.type,
      isExternal: asset.isExternal,
      checksum: asset.checksum,
      timeZone: asset.exifInfo?.timeZone || null,
      fileCreatedAt: asset.fileCreatedAt,
      originalPath: asset.originalPath,
      originalFileName: filename,
      fileSizeInByte: asset.exifInfo?.fileSizeInByte || null,
      files: asset.files ?? [],
      make: asset.exifInfo?.make || null,
      model: asset.exifInfo?.model || null,
      lensModel: asset.exifInfo?.lensModel || null,
    };

    const newPath = await this.renderTemplatePath(
      storageAsset,
      {
        storageLabel,
        filename,
      },
      assetRootPath,
    );

    // Move main file
    const oldPath = asset.originalPath;
    if (oldPath !== newPath) {
      await this.storageCore.moveFile({
        entityId: asset.id,
        pathType: AssetPathType.Original,
        oldPath,
        newPath,
        assetInfo: {
          sizeInBytes: asset.exifInfo?.fileSizeInByte || 0,
          checksum: asset.checksum,
        },
      });
    }

    // Move sidecar file
    const sidecarPath = getAssetFiles(asset.files ?? []).sidecarFile?.path;
    if (sidecarPath) {
      const newSidecarPath = `${newPath}.xmp`;
      await this.storageCore.moveFile({
        entityId: asset.id,
        pathType: AssetFileType.Sidecar,
        oldPath: sidecarPath,
        newPath: newSidecarPath,
      });
    }

    // Move live photo motion video
    let livePhotoVideoNewPath: string | null = null;
    let shouldMoveLivePhotoVideo = false;
    if (asset.livePhotoVideoId) {
      const livePhotoVideo = await this.assetRepository.getById(asset.livePhotoVideoId, {
        exifInfo: true,
        owner: true,
        files: true,
      });

      // Avoid moving Android motion videos if they come from android motion picture file (.MP.jpg).
      if (livePhotoVideo && !StorageCore.isAndroidMotionPath(livePhotoVideo.originalPath)) {
        shouldMoveLivePhotoVideo = true;
      }

      if (livePhotoVideo && shouldMoveLivePhotoVideo) {
        const motionFilename = getLivePhotoMotionFilename(filename, livePhotoVideo.originalPath);
        const motionStorageAsset: StorageAsset = {
          id: livePhotoVideo.id,
          ownerId: livePhotoVideo.ownerId,
          livePhotoVideoId: livePhotoVideo.livePhotoVideoId,
          type: livePhotoVideo.type,
          isExternal: livePhotoVideo.isExternal,
          checksum: livePhotoVideo.checksum,
          timeZone: livePhotoVideo.exifInfo?.timeZone || null,
          fileCreatedAt: livePhotoVideo.fileCreatedAt,
          originalPath: livePhotoVideo.originalPath,
          originalFileName: livePhotoVideo.originalFileName || motionFilename,
          fileSizeInByte: livePhotoVideo.exifInfo?.fileSizeInByte || null,
          files: livePhotoVideo.files ?? [],
          make: livePhotoVideo.exifInfo?.make || null,
          model: livePhotoVideo.exifInfo?.model || null,
          lensModel: livePhotoVideo.exifInfo?.lensModel || null,
        };

        livePhotoVideoNewPath = await this.renderTemplatePath(
          motionStorageAsset,
          {
            storageLabel,
            filename: motionFilename,
          },
          assetRootPath,
          storageAsset,
        );

        if (shouldMoveLivePhotoVideo && livePhotoVideo.originalPath !== livePhotoVideoNewPath) {
          await this.storageCore.moveFile({
            entityId: livePhotoVideo.id,
            pathType: AssetPathType.Original,
            oldPath: livePhotoVideo.originalPath,
            newPath: livePhotoVideoNewPath,
            assetInfo: {
              sizeInBytes: livePhotoVideo.exifInfo?.fileSizeInByte || 0,
              checksum: livePhotoVideo.checksum,
            },
          });
        }
      }
    }

    const isExternal = targetLibraryId !== null;

    await this.assetRepository.update({
      id: asset.id,
      libraryId: targetLibraryId,
      isExternal,
      originalPath: newPath,
    });

    if (asset.livePhotoVideoId) {
      if (shouldMoveLivePhotoVideo && livePhotoVideoNewPath) {
        await this.assetRepository.update({
          id: asset.livePhotoVideoId,
          libraryId: targetLibraryId,
          isExternal,
          originalPath: livePhotoVideoNewPath,
        });
      } else {
        await this.assetRepository.update({
          id: asset.livePhotoVideoId,
          libraryId: targetLibraryId,
          isExternal,
        });
      }
    }

    return { id: assetId, success: true };
  }

  @OnEvent({ name: 'AssetDelete' })
  async handleMoveHistoryCleanup({ assetId }: ArgOf<'AssetDelete'>) {
    this.logger.debug(`Cleaning up move history for asset ${assetId}`);
    await this.moveRepository.cleanMoveHistorySingle(assetId);
  }

  async moveAsset(asset: StorageAsset, metadata: MoveAssetMetadata, stillPhoto?: StorageAsset) {
    if (asset.isExternal || StorageCore.isAndroidMotionPath(asset.originalPath)) {
      // External assets are not affected by storage template
      // TODO: shouldn't this only apply to external assets?
      return;
    }

    return this.databaseRepository.withLock(DatabaseLock.StorageTemplateMigration, async () => {
      const { id, originalPath, checksum, fileSizeInByte } = asset;
      const oldPath = originalPath;
      const newPath = await this.getTemplatePath(asset, metadata, stillPhoto);

      if (!fileSizeInByte) {
        this.logger.error(`Asset ${id} missing exif info, skipping storage template migration`);
        return;
      }

      try {
        await this.storageCore.moveFile({
          entityId: id,
          pathType: AssetPathType.Original,
          oldPath,
          newPath,
          assetInfo: { sizeInBytes: fileSizeInByte, checksum },
        });

        const sidecarPath = getAssetFile(asset.files, AssetFileType.Sidecar, { isEdited: false })?.path;
        if (sidecarPath) {
          await this.storageCore.moveFile({
            entityId: id,
            pathType: AssetFileType.Sidecar,
            oldPath: sidecarPath,
            newPath: `${newPath}.xmp`,
          });
        }
      } catch (error: any) {
        this.logger.error(`Problem applying storage template`, error?.stack, { id, oldPath, newPath });
      }
    });
  }

  async renderTemplatePath(
    asset: StorageAsset,
    metadata: MoveAssetMetadata,
    rootPath: string,
    stillPhoto?: StorageAsset,
  ): Promise<string> {
    const config = await this.getConfig({ withCache: true });
    if (!config.storageTemplate.enabled) {
      throw new BadRequestException('Storage template is not enabled or configured by admin');
    }
    return this.getTemplatePath(asset, metadata, stillPhoto, rootPath);
  }

  private async getTemplatePath(
    asset: StorageAsset,
    metadata: MoveAssetMetadata,
    stillPhoto?: StorageAsset,
    overrideRootPath?: string,
  ): Promise<string> {
    const { storageLabel, filename } = metadata;

    try {
      const filenameWithoutExtension = path.basename(filename, getFilenameExtension(filename));

      const source = asset.originalPath;
      let extension = getFilenameExtension(source).split('.').pop() as string;
      const sanitized = sanitize(path.basename(filenameWithoutExtension, `.${extension}`));
      extension = extension?.toLowerCase();

      // OverrideRootPath is passed in when the function is called to move assets from one library to another.
      const rootPath = overrideRootPath ?? StorageCore.getLibraryFolder({ id: asset.ownerId, storageLabel });

      switch (extension) {
        case 'jpeg':
        case 'jpe': {
          extension = 'jpg';
          break;
        }
        case 'tif': {
          extension = 'tiff';
          break;
        }
        case '3gpp': {
          extension = '3gp';
          break;
        }
        case 'mpeg':
        case 'mpe': {
          extension = 'mpg';
          break;
        }
        case 'm2ts':
        case 'm2t': {
          extension = 'mts';
          break;
        }
      }

      let albumName = null;
      let albumStartDate = null;
      let albumEndDate = null;
      const assetForMetadata = stillPhoto || asset;

      if (this.template.needsAlbum) {
        // For motion videos, use the still photo's album information since motion videos
        // don't have album metadata attached directly
        const albums = await this.albumRepository.getByAssetId(assetForMetadata.ownerId, assetForMetadata.id);
        const album = albums?.[0];
        if (album) {
          albumName = album.albumName || null;

          if (this.template.needsAlbumMetadata) {
            const [metadata] = await this.albumRepository.getMetadataForIds([album.id]);
            albumStartDate = metadata?.startDate || null;
            albumEndDate = metadata?.endDate || null;
          }
        }
      }

      // For motion videos that are part of live photos, use the still photo's date
      // to ensure both parts end up in the same folder
      const storagePath = this.render(this.template.compiled, {
        asset: assetForMetadata,
        filename: sanitized,
        extension,
        albumName,
        albumStartDate,
        albumEndDate,
        make: assetForMetadata.make,
        model: assetForMetadata.model,
        lensModel: assetForMetadata.lensModel,
      });
      const fullPath = path.normalize(path.join(rootPath, storagePath));
      let destination = `${fullPath}.${extension}`;

      if (!fullPath.startsWith(rootPath)) {
        this.logger.warn(`Skipped attempt to access an invalid path: ${fullPath}. Path should start with ${rootPath}`);
        return source;
      }

      if (source === destination) {
        return source;
      }

      /**
       * In case of migrating duplicate filename to a new path, we need to check if it is already migrated
       * Due to the mechanism of appending +1, +2, +3, etc to the filename
       *
       * Example:
       * Source = upload/abc/def/FullSizeRender+7.heic
       * Expected Destination = upload/abc/def/FullSizeRender.heic
       *
       * The file is already at the correct location, but since there are other FullSizeRender.heic files in the
       * destination, it was renamed to FullSizeRender+7.heic.
       *
       * The lines below will be used to check if the differences between the source and destination is only the
       * +7 suffix, and if so, it will be considered as already migrated.
       */
      if (source.startsWith(fullPath) && source.endsWith(`.${extension}`)) {
        const diff = source.replace(fullPath, '').replace(`.${extension}`, '');
        const hasDuplicationAnnotation = /^\+\d+$/.test(diff);
        if (hasDuplicationAnnotation) {
          return source;
        }
      }

      let duplicateCount = 0;

      while (true) {
        const isExists = await this.storageRepository.checkFileExists(destination);
        if (!isExists) {
          break;
        }

        duplicateCount++;
        destination = `${fullPath}+${duplicateCount}.${extension}`;
      }

      return destination;
    } catch (error: any) {
      this.logger.error(`Unable to get template path for ${filename}: ${error}`);
      return asset.originalPath;
    }
  }

  private compile(template: string) {
    return {
      raw: template,
      compiled: handlebar.compile(template, { knownHelpers: undefined, strict: true }),
      needsAlbum: template.includes('album'),
      needsAlbumMetadata: template.includes('album-startDate') || template.includes('album-endDate'),
    };
  }

  private render(template: HandlebarsTemplateDelegate<any>, options: RenderMetadata) {
    const { filename, extension, asset, albumName, albumStartDate, albumEndDate, make, model, lensModel } = options;
    const substitutions: Record<string, string> = {
      filename,
      ext: extension,
      filetype: asset.type === AssetType.Image ? 'IMG' : 'VID',
      filetypefull: asset.type === AssetType.Image ? 'IMAGE' : 'VIDEO',
      assetId: asset.id,
      assetIdShort: asset.id.slice(-12),
      //just throw into the root if it doesn't belong to an album
      album: (albumName && sanitize(albumName.replaceAll(/\.+/g, ''))) || '',
      make: make ?? '',
      model: model ?? '',
      lensModel: lensModel ?? '',
    };

    const dt = DateTime.fromJSDate(asset.fileCreatedAt);

    for (const token of Object.values(storageTokens).flat()) {
      substitutions[token] = dt.toFormat(token);
      if (albumName) {
        // Album date tokens are rendered in the server time zone to match storage template datetime behavior.
        substitutions['album-startDate-' + token] = albumStartDate
          ? DateTime.fromJSDate(albumStartDate).toFormat(token)
          : '';
        substitutions['album-endDate-' + token] = albumEndDate ? DateTime.fromJSDate(albumEndDate).toFormat(token) : '';
      }
    }

    return template(substitutions).replaceAll(/\/{2,}/gm, '/');
  }
}
