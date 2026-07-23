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
  | 'ActionsDescription'
  | 'ActionsSoftwareAgentName'
  | 'AFAreaMode'
  | 'AFAreaModeSetting'
  | 'AFMode'
  | 'AFPointPosition'
  | 'AFSubjectDetection'
  | 'AmbientTemperature'
  | 'AutoISO'
  | 'Brightness'
  | 'CameraTemperature'
  | 'CameraType'
  | 'CanonExposureMode'
  | 'Claim_Generator_InfoName'
  | 'Clarity'
  | 'ColorChromeEffect'
  | 'ColorChromeFXBlue'
  | 'ColorTempKelvin'
  | 'ColorTemperature'
  | 'ColorTone'
  | 'ContinuousDrive'
  | 'Contrast'
  | 'CreatorTool'
  | 'CustomRendered'
  | 'DevelopmentDynamicRange'
  | 'DriveMode'
  | 'DynamicRange'
  | 'ElectronicFrontCurtainShutter'
  | 'ExifVersion'
  | 'ExposureCompensation'
  | 'ExposureMode'
  | 'ExposureProgram'
  | 'FacesDetected'
  | 'Fade'
  | 'FileFormat'
  | 'FilmMode'
  | 'Flash'
  | 'FlashAction'
  | 'FocusLocation'
  | 'FocusMode'
  | 'FocusMode2'
  | 'FocusPixel'
  | 'GrainEffectRoughness'
  | 'GrainEffectSize'
  | 'HighlightTone'
  | 'Highlights'
  | 'HistorySoftwareAgent'
  | 'ImageQuality'
  | 'ImageStabilization'
  | 'JPEGQuality'
  | 'LUT1Name'
  | 'LUT1Opacity'
  | 'LUT2Name'
  | 'LUT2Opacity'
  | 'MeteringMode'
  | 'MonochromeGrainEffect'
  | 'MPImageLength'
  | 'NoiseReduction'
  | 'NumberOfImages'
  | 'PictureEffect'
  | 'PictureMode'
  | 'PictureStyle'
  | 'PitchAngle'
  | 'Quality'
  | 'ReleaseMode'
  | 'RollAngle'
  | 'Saturation'
  | 'SceneCaptureType'
  | 'SensitivityType'
  | 'ShadowTone'
  | 'Shadows'
  | 'Sharpness'
  | 'SharpnessRange'
  | 'ShootingMode'
  | 'Shutter'
  | 'ShutterType'
  | 'Software'
  | 'UserComment'
  | 'WBShiftAB'
  | 'WBShiftGM'
  | 'WhiteBalance'
  | 'WhiteBalanceFineTune';

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
  ActionsDescription?: string | number;
  ActionsSoftwareAgentName?: string | number;
  AFAreaMode?: string | number;
  AFAreaModeSetting?: string | number;
  AFMode?: string | number;
  AFPointPosition?: string | number;
  AFSubjectDetection?: string | number;
  AmbientTemperature?: string | number;
  AutoISO?: string | number;
  Brightness?: string | number;
  CameraTemperature?: string | number;
  CameraType?: string | number;
  CanonExposureMode?: string | number;
  Claim_Generator_InfoName?: string | number;
  Clarity?: string | number;
  ColorChromeEffect?: string | number;
  ColorChromeFXBlue?: string | number;
  ColorTempKelvin?: string | number;
  ColorTemperature?: string | number;
  ColorTone?: string | number;
  ContinuousDrive?: string | number;
  Contrast?: string | number;
  CreatorTool?: string | number;
  CustomRendered?: string | number;
  DevelopmentDynamicRange?: string | number;
  DriveMode?: string | number;
  DynamicRange?: string | number;
  ElectronicFrontCurtainShutter?: string | number;
  ExifVersion?: string;
  ExposureCompensation?: string | number;
  ExposureMode?: string | number;
  ExposureProgram?: string | number;
  FacesDetected?: string | number;
  Fade?: string | number;
  FileFormat?: string | number;
  FilmMode?: string | number;
  Flash?: string | number;
  FlashAction?: string | number;
  FocusLocation?: string | number;
  FocusMode?: string | number;
  FocusMode2?: string | number;
  FocusPixel?: string | number;
  GrainEffectRoughness?: string | number;
  GrainEffectSize?: string | number;
  HighlightTone?: string | number;
  Highlights?: string | number;
  HistorySoftwareAgent?: string | number;
  ImageQuality?: string | number;
  ImageStabilization?: string | number;
  JPEGQuality?: string | number;
  LUT1Name?: string | number;
  LUT1Opacity?: string | number;
  LUT2Name?: string | number;
  LUT2Opacity?: string | number;
  MeteringMode?: string | number;
  MonochromeGrainEffect?: string | number;
  MPImageLength?: string | number;
  NoiseReduction?: string | number;
  NumberOfImages?: string | number;
  PictureEffect?: string | number;
  PictureMode?: string | number;
  PictureStyle?: string | number;
  PitchAngle?: string | number;
  Quality?: string | number;
  ReleaseMode?: string | number;
  RollAngle?: string | number;
  Saturation?: string | number;
  SceneCaptureType?: string | number;
  SensitivityType?: string | number;
  ShadowTone?: string | number;
  Shadows?: string | number;
  Sharpness?: string | number;
  SharpnessRange?: string | number;
  ShootingMode?: string | number;
  Shutter?: string | number;
  ShutterType?: string | number;
  Software?: string | number;
  UserComment?: string | number;
  WBShiftAB?: string | number;
  WBShiftGM?: string | number;
  WhiteBalance?: string | number;
  WhiteBalanceFineTune?: string | number;
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
