import {
  Column,
  ForeignKeyColumn,
  Generated,
  Index,
  Int8,
  Table,
  Timestamp,
  UpdateDateColumn,
} from '@immich/sql-tools';
import { LockableProperty } from 'src/database';
import { UpdatedAtTrigger, UpdateIdColumn } from 'src/decorators';
import { AssetTable } from 'src/schema/tables/asset.table';

@Table('asset_exif')
@Index({
  name: 'IDX_asset_exif_gist_earthcoord',
  using: 'gist',
  expression: 'll_to_earth_public(latitude, longitude)',
})
@UpdatedAtTrigger('asset_exif_updatedAt')
export class AssetExifTable {
  @ForeignKeyColumn(() => AssetTable, { onDelete: 'CASCADE', primary: true })
  assetId!: string;

  @Column({ type: 'character varying', nullable: true })
  make!: string | null;

  @Column({ type: 'character varying', nullable: true })
  model!: string | null;

  @Column({ type: 'integer', nullable: true })
  exifImageWidth!: number | null;

  @Column({ type: 'integer', nullable: true })
  exifImageHeight!: number | null;

  @Column({ type: 'bigint', nullable: true })
  fileSizeInByte!: Int8 | null;

  @Column({ type: 'character varying', nullable: true })
  orientation!: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  dateTimeOriginal!: Timestamp | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  modifyDate!: Timestamp | null;

  @Column({ type: 'character varying', nullable: true })
  lensModel!: string | null;

  @Column({ type: 'double precision', nullable: true })
  fNumber!: number | null;

  @Column({ type: 'double precision', nullable: true })
  focalLength!: number | null;

  @Column({ type: 'integer', nullable: true })
  iso!: number | null;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({ type: 'character varying', nullable: true, index: true })
  city!: string | null;

  @Column({ type: 'character varying', nullable: true })
  state!: string | null;

  @Column({ type: 'character varying', nullable: true })
  country!: string | null;

  @Column({ type: 'text', default: '' })
  description!: Generated<string>; // or caption

  @Column({ type: 'double precision', nullable: true })
  fps!: number | null;

  @Column({ type: 'character varying', nullable: true })
  exposureTime!: string | null;

  @Column({ type: 'character varying', nullable: true, index: true })
  livePhotoCID!: string | null;

  @Column({ type: 'character varying', nullable: true })
  timeZone!: string | null;

  @Column({ type: 'character varying', nullable: true })
  projectionType!: string | null;

  @Column({ type: 'character varying', nullable: true })
  profileDescription!: string | null;

  @Column({ type: 'character varying', nullable: true })
  colorspace!: string | null;

  @Column({ type: 'integer', nullable: true })
  bitsPerSample!: number | null;

  @Column({ type: 'character varying', nullable: true, index: true })
  autoStackId!: string | null;

  @Column({ type: 'integer', nullable: true })
  rating!: number | null;

  @Column({ type: 'character varying', array: true, nullable: true })
  tags!: string[] | null;

  // General EXIF fields (Sorted alphabetically)
  @Column({ type: 'character varying', nullable: true })
  exifVersion!: string | null;

  @Column({ type: 'character varying', nullable: true })
  exposureCompensation!: string | null;

  @Column({ type: 'character varying', nullable: true })
  exposureMode!: string | null;

  @Column({ type: 'character varying', nullable: true })
  exposureProgram!: string | null;

  @Column({ type: 'character varying', nullable: true })
  meteringMode!: string | null;

  @Column({ type: 'character varying', nullable: true })
  sensitivityType!: string | null;

  @Column({ type: 'character varying', nullable: true })
  whiteBalance!: string | null;

  // Brand-Specific Fields (Sorted alphabetically)
  @Column({ type: 'character varying', nullable: true })
  afAreaMode!: string | null;

  @Column({ type: 'character varying', nullable: true })
  afPointPosition!: string | null;

  @Column({ type: 'character varying', nullable: true })
  afSubjectDetection!: string | null;

  @Column({ type: 'character varying', nullable: true })
  autoISO!: string | null;

  @Column({ type: 'character varying', nullable: true })
  brightness!: string | null;

  @Column({ type: 'character varying', nullable: true })
  cameraTemperature!: string | null;

  @Column({ type: 'character varying', nullable: true })
  cameraType!: string | null;

  @Column({ type: 'character varying', nullable: true })
  canonExposureMode!: string | null;

  @Column({ type: 'character varying', nullable: true })
  clarity!: string | null;

  @Column({ type: 'character varying', nullable: true })
  colorChromeEffect!: string | null;

  @Column({ type: 'character varying', nullable: true })
  colorChromeFXBlue!: string | null;

  @Column({ type: 'character varying', nullable: true })
  colorTempKelvin!: string | null;

  @Column({ type: 'character varying', nullable: true })
  colorTemperature!: string | null;

  @Column({ type: 'character varying', nullable: true })
  colorTone!: string | null;

  @Column({ type: 'character varying', nullable: true })
  continuousDrive!: string | null;

  @Column({ type: 'character varying', nullable: true })
  contrast!: string | null;

  @Column({ type: 'character varying', nullable: true })
  driveMode!: string | null;

  @Column({ type: 'character varying', nullable: true })
  facesDetected!: string | null;

  @Column({ type: 'character varying', nullable: true })
  fileFormat!: string | null;

  @Column({ type: 'character varying', nullable: true })
  filmMode!: string | null;

  @Column({ type: 'character varying', nullable: true })
  focusLocation!: string | null;

  @Column({ type: 'character varying', nullable: true })
  focusMode!: string | null;

  @Column({ type: 'character varying', nullable: true })
  focusMode2!: string | null;

  @Column({ type: 'character varying', nullable: true })
  focusPixel!: string | null;

  @Column({ type: 'character varying', nullable: true })
  highlightTone!: string | null;

  @Column({ type: 'character varying', nullable: true })
  highlights!: string | null;

  @Column({ type: 'character varying', nullable: true })
  imageQuality!: string | null;

  @Column({ type: 'character varying', nullable: true })
  imageStabilization!: string | null;

  @Column({ type: 'character varying', nullable: true })
  jpegQuality!: string | null;

  @Column({ type: 'character varying', nullable: true })
  lut1Name!: string | null;

  @Column({ type: 'character varying', nullable: true })
  lut1Opacity!: string | null;

  @Column({ type: 'character varying', nullable: true })
  lut2Name!: string | null;

  @Column({ type: 'character varying', nullable: true })
  lut2Opacity!: string | null;

  @Column({ type: 'character varying', nullable: true })
  monochromeGrainEffect!: string | null;

  @Column({ type: 'character varying', nullable: true })
  noiseReduction!: string | null;

  @Column({ type: 'character varying', nullable: true })
  pictureEffect!: string | null;

  @Column({ type: 'character varying', nullable: true })
  pictureMode!: string | null;

  @Column({ type: 'character varying', nullable: true })
  pictureStyle!: string | null;

  @Column({ type: 'character varying', nullable: true })
  pitchAngle!: string | null;

  @Column({ type: 'character varying', nullable: true })
  quality!: string | null;

  @Column({ type: 'character varying', nullable: true })
  rollAngle!: string | null;

  @Column({ type: 'character varying', nullable: true })
  saturation!: string | null;

  @Column({ type: 'character varying', nullable: true })
  shadowTone!: string | null;

  @Column({ type: 'character varying', nullable: true })
  shadows!: string | null;

  @Column({ type: 'character varying', nullable: true })
  sharpness!: string | null;

  @Column({ type: 'character varying', nullable: true })
  shootingMode!: string | null;

  @Column({ type: 'character varying', nullable: true })
  shutterType!: string | null;

  @Column({ type: 'character varying', nullable: true })
  wbShiftAB!: string | null;

  @Column({ type: 'character varying', nullable: true })
  wbShiftGM!: string | null;

  @Column({ type: 'character varying', nullable: true })
  whiteBalanceFineTune!: string | null;

  @UpdateDateColumn({ default: () => 'clock_timestamp()' })
  updatedAt!: Generated<Timestamp>;

  @UpdateIdColumn({ index: true })
  updateId!: Generated<string>;

  @Column({ type: 'character varying', array: true, nullable: true })
  lockedProperties!: Array<LockableProperty> | null;
}
