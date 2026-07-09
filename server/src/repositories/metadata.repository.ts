import { Injectable } from '@nestjs/common';
import { BinaryField, DefaultReadTaskOptions, ExifTool, ReadTaskOptions, Tags } from 'exiftool-vendored';
import geotz from 'geo-tz';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { mimeTypes } from 'src/utils/mime-types';

interface ExifDuration {
  Value: number;
  Scale?: number;
}

type StringOrNumber = string | number;

type TagsWithWrongTypes =
  | 'FocalLength'
  | 'Duration'
  | 'Description'
  | 'ImageDescription'
  | 'RegionInfo'
  | 'TagsList'
  | 'Keywords'
  | 'HierarchicalSubject'
  | 'ISO'
  | 'ExifVersion'
  | 'SensitivityType'
  | 'ExposureProgram'
  | 'ExposureCompensation'
  | 'ExposureMode'
  | 'WhiteBalance'
  | 'MeteringMode'
  | 'Quality'
  | 'Sharpness'
  | 'WhiteBalanceFineTune'
  | 'NoiseReduction'
  | 'Clarity'
  | 'FocusMode'
  | 'FocusPixel'
  | 'FocusMode2'
  | 'PictureMode'
  | 'ShadowTone'
  | 'HighlightTone'
  | 'ColorChromeEffect'
  | 'ColorChromeFXBlue'
  | 'DriveMode'
  | 'ShutterType'
  | 'FilmMode'
  | 'ContinuousDrive'
  | 'CanonExposureMode'
  | 'ColorTone'
  | 'AutoISO'
  | 'CameraTemperature'
  | 'CameraType'
  | 'ColorTemperature'
  | 'PictureStyle'
  | 'AFAreaMode'
  | 'Saturation'
  | 'Contrast'
  | 'Brightness'
  | 'FileFormat'
  | 'PictureEffect'
  | 'FocusLocation'
  | 'Shadows'
  | 'Highlights'
  | 'ImageQuality'
  | 'ImageStabilization'
  | 'ShootingMode'
  | 'FacesDetected'
  | 'JPEGQuality'
  | 'ColorTempKelvin'
  | 'WBShiftAB'
  | 'WBShiftGM'
  | 'AFPointPosition'
  | 'RollAngle'
  | 'PitchAngle'
  | 'MonochromeGrainEffect'
  | 'AFSubjectDetection'
  | 'LUT1Name'
  | 'LUT1Opacity'
  | 'LUT2Name'
  | 'LUT2Opacity';

export interface ImmichTags extends Omit<Tags, TagsWithWrongTypes> {
  ContentIdentifier?: string;
  MotionPhoto?: number;
  MotionPhotoVersion?: number;
  MotionPhotoPresentationTimestampUs?: number;
  MediaGroupUUID?: string;
  ImagePixelDepth?: string;
  FocalLength?: number;
  Duration?: number | string | ExifDuration;
  EmbeddedVideoType?: string;
  EmbeddedVideoFile?: BinaryField;
  MotionPhotoVideo?: BinaryField;
  TagsList?: StringOrNumber[];
  HierarchicalSubject?: StringOrNumber[];
  Keywords?: StringOrNumber | StringOrNumber[];
  ISO?: number | number[];

  // Type is wrong, can also be number.
  Description?: StringOrNumber;
  ImageDescription?: StringOrNumber;

  // Extended properties for image regions, such as faces
  RegionInfo?: {
    AppliedToDimensions: {
      W: number;
      H: number;
      Unit: string;
    };
    RegionList: {
      Area: {
        // (X,Y) // center of the rectangle
        X: number | string;
        Y: number | string;
        W: number | string;
        H: number | string;
        Unit: string;
      };
      Rotation?: number;
      Type?: string;
      Name?: string;
    }[];
  };

  Device?: {
    Manufacturer?: string;
    ModelName?: string;
  };

  AndroidMake?: string;
  AndroidModel?: string;
  DeviceManufacturer?: string;
  DeviceModelName?: string;

  // Extra & Brand-Specific EXIF fields
  ExifVersion?: string;
  SensitivityType?: string | number;
  ExposureProgram?: string | number;
  ExposureCompensation?: string | number;
  ExposureMode?: string | number;
  WhiteBalance?: string | number;
  MeteringMode?: string | number;
  Quality?: string | number;
  Sharpness?: string | number;
  WhiteBalanceFineTune?: string | number;
  NoiseReduction?: string | number;
  Clarity?: string | number;
  FocusMode?: string | number;
  FocusPixel?: string | number;
  FocusMode2?: string | number;
  PictureMode?: string | number;
  ShadowTone?: string | number;
  HighlightTone?: string | number;
  ColorChromeEffect?: string | number;
  ColorChromeFXBlue?: string | number;
  DriveMode?: string | number;
  ShutterType?: string | number;
  FilmMode?: string | number;
  ContinuousDrive?: string | number;
  CanonExposureMode?: string | number;
  ColorTone?: string | number;
  AutoISO?: string | number;
  CameraTemperature?: string | number;
  CameraType?: string | number;
  ColorTemperature?: string | number;
  PictureStyle?: string | number;
  AFAreaMode?: string | number;
  Saturation?: string | number;
  Contrast?: string | number;
  Brightness?: string | number;
  FileFormat?: string | number;
  PictureEffect?: string | number;
  FocusLocation?: string | number;
  Shadows?: string | number;
  Highlights?: string | number;
  ImageQuality?: string | number;
  ImageStabilization?: string | number;
  ShootingMode?: string | number;
  FacesDetected?: string | number;
  JPEGQuality?: string | number;
  ColorTempKelvin?: string | number;
  WBShiftAB?: string | number;
  WBShiftGM?: string | number;
  AFPointPosition?: string | number;
  RollAngle?: string | number;
  PitchAngle?: string | number;
  MonochromeGrainEffect?: string | number;
  AFSubjectDetection?: string | number;
  LUT1Name?: string | number;
  LUT1Opacity?: string | number;
  LUT2Name?: string | number;
  LUT2Opacity?: string | number;
}

@Injectable()
export class MetadataRepository {
  private exiftool = new ExifTool({
    defaultVideosToUTC: true,
    backfillTimezones: true,
    inferTimezoneFromDatestamps: true,
    inferTimezoneFromTimeStamp: true,
    useMWG: true,
    numericTags: [...DefaultReadTaskOptions.numericTags, 'FocalLength', 'FileSize', 'Rotation'],
    /* eslint unicorn/no-array-callback-reference: off, unicorn/no-array-method-this-argument: off */
    geoTz: (lat, lon) => geotz.find(lat, lon)[0],
    geolocation: true,
    // Enable exiftool LFS to parse metadata for files larger than 2GB.
    readArgs: ['-api', 'largefilesupport=1', '--ICC_Profile:DeviceManufacturer', '--ICC_Profile:DeviceModelName'],
    writeArgs: ['-api', 'largefilesupport=1', '-overwrite_original'],
    taskTimeoutMillis: 2 * 60 * 1000,
  });

  constructor(private logger: LoggingRepository) {
    this.logger.setContext(MetadataRepository.name);
  }

  setMaxConcurrency(concurrency: number) {
    this.exiftool.batchCluster.setMaxProcs(concurrency);
  }

  async teardown() {
    await this.exiftool.end();
  }

  readTags(path: string): Promise<ImmichTags> {
    const options: ReadTaskOptions | undefined = mimeTypes.isVideo(path) ? { readArgs: ['-ee'] } : undefined;
    return this.exiftool.read(path, options).catch((error) => {
      this.logger.warn(`Error reading exif data (${path}): ${error}\n${error?.stack}`);
      return {};
    }) as Promise<ImmichTags>;
  }

  extractBinaryTag(path: string, tagName: string): Promise<Buffer> {
    return this.exiftool.extractBinaryTagToBuffer(tagName, path);
  }

  async writeTags(path: string, tags: Partial<Tags>): Promise<void> {
    // If exiftool assigns a field with ^= instead of =, empty values will be written too.
    // Since exiftool-vendored doesn't support an option for this, we append the ^ to the name of the tag instead.
    // https://exiftool.org/exiftool_pod.html#:~:text=is%20used%20to%20write%20an%20empty%20string
    const tagsToWrite = Object.fromEntries(Object.entries(tags).map(([key, value]) => [`${key}^`, value]));
    try {
      await this.exiftool.write(path, tagsToWrite);
    } catch (error) {
      this.logger.warn(`Error writing exif data (${path}): ${error}`);
    }
  }
}
