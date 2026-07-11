import { BadRequestException, Injectable } from '@nestjs/common';
import { OnEvent } from 'src/decorators';
import { mapAsset } from 'src/dtos/asset-response.dto';
import { JobCreateDto } from 'src/dtos/job.dto';
import { AssetType, AssetVisibility, IntegrityReport, JobName, JobStatus, ManualJobName } from 'src/enum';
import { ArgsOf } from 'src/repositories/event.repository';
import { BaseService } from 'src/services/base.service';
import { JobItem } from 'src/types';
import { hexOrBufferToBase64 } from 'src/utils/bytes';

const asJobItem = (dto: JobCreateDto): JobItem => {
  switch (dto.name) {
    case ManualJobName.TagCleanup: {
      return { name: JobName.TagCleanup };
    }

    case ManualJobName.PersonCleanup: {
      return { name: JobName.PersonCleanup };
    }

    case ManualJobName.UserCleanup: {
      return { name: JobName.UserDeleteCheck };
    }

    case ManualJobName.MemoryCleanup: {
      return { name: JobName.MemoryCleanup };
    }

    case ManualJobName.MemoryCreate: {
      return { name: JobName.MemoryGenerate };
    }

    case ManualJobName.BackupDatabase: {
      return { name: JobName.DatabaseBackup };
    }

    case ManualJobName.IntegrityMissingFiles: {
      return { name: JobName.IntegrityMissingFilesQueueAll };
    }

    case ManualJobName.IntegrityUntrackedFiles: {
      return { name: JobName.IntegrityUntrackedFilesQueueAll };
    }

    case ManualJobName.IntegrityChecksumFiles: {
      return { name: JobName.IntegrityChecksumFiles };
    }

    case ManualJobName.IntegrityMissingFilesRefresh: {
      return { name: JobName.IntegrityMissingFilesQueueAll, data: { refreshOnly: true } };
    }

    case ManualJobName.IntegrityUntrackedFilesRefresh: {
      return { name: JobName.IntegrityUntrackedFilesQueueAll, data: { refreshOnly: true } };
    }

    case ManualJobName.IntegrityChecksumFilesRefresh: {
      return { name: JobName.IntegrityChecksumFiles, data: { refreshOnly: true } };
    }

    case ManualJobName.IntegrityMissingFilesDeleteAll: {
      return { name: JobName.IntegrityDeleteReportType, data: { type: IntegrityReport.MissingFile } };
    }

    case ManualJobName.IntegrityUntrackedFilesDeleteAll: {
      return { name: JobName.IntegrityDeleteReportType, data: { type: IntegrityReport.UntrackedFile } };
    }

    case ManualJobName.IntegrityChecksumFilesDeleteAll: {
      return { name: JobName.IntegrityDeleteReportType, data: { type: IntegrityReport.ChecksumFail } };
    }

    default: {
      throw new BadRequestException('Invalid job name');
    }
  }
};

@Injectable()
export class JobService extends BaseService {
  async create(dto: JobCreateDto): Promise<void> {
    await this.jobRepository.queue(asJobItem(dto));
  }

  @OnEvent({ name: 'JobRun' })
  async onJobRun(...[queueName, job]: ArgsOf<'JobRun'>) {
    try {
      await this.eventRepository.emit('JobStart', queueName, job);
      const response = await this.jobRepository.run(job);
      await this.eventRepository.emit('JobSuccess', { job, response });
      if (response && typeof response === 'string' && [JobStatus.Success, JobStatus.Skipped].includes(response)) {
        await this.onDone(job);
      }
    } catch (error: Error | any) {
      await this.eventRepository.emit('JobError', { job, error });
    } finally {
      await this.eventRepository.emit('JobComplete', queueName, job);
    }
  }

  /**
   * Queue follow up jobs
   */
  private async onDone(item: JobItem) {
    switch (item.name) {
      case JobName.SidecarCheck: {
        await this.jobRepository.queue({ name: JobName.AssetExtractMetadata, data: item.data });
        break;
      }

      case JobName.SidecarWrite: {
        await this.jobRepository.queue({
          name: JobName.AssetExtractMetadata,
          data: { id: item.data.id, source: 'sidecar-write' },
        });
        break;
      }

      case JobName.StorageTemplateMigrationSingle: {
        if (item.data.source === 'upload' || item.data.source === 'copy') {
          await this.jobRepository.queue({ name: JobName.AssetGenerateThumbnails, data: item.data });
        }
        break;
      }

      case JobName.PersonGenerateThumbnail: {
        const { id } = item.data;
        const person = await this.personRepository.getById(id);
        if (person) {
          this.websocketRepository.clientSend('on_person_thumbnail', person.ownerId, person.id);
        }
        break;
      }

      case JobName.AssetEditThumbnailGeneration: {
        const asset = await this.assetRepository.getById(item.data.id);
        const edits = await this.assetEditRepository.getWithSyncInfo(item.data.id);

        if (asset) {
          this.websocketRepository.clientSend('AssetEditReadyV2', asset.ownerId, {
            asset: {
              id: asset.id,
              ownerId: asset.ownerId,
              originalFileName: asset.originalFileName,
              thumbhash: asset.thumbhash ? hexOrBufferToBase64(asset.thumbhash) : null,
              checksum: hexOrBufferToBase64(asset.checksum),
              fileCreatedAt: asset.fileCreatedAt,
              fileModifiedAt: asset.fileModifiedAt,
              createdAt: asset.createdAt,
              localDateTime: asset.localDateTime,
              duration: asset.duration,
              type: asset.type,
              deletedAt: asset.deletedAt,
              isFavorite: asset.isFavorite,
              visibility: asset.visibility,
              livePhotoVideoId: asset.livePhotoVideoId,
              stackId: asset.stackId,
              libraryId: asset.libraryId,
              width: asset.width,
              height: asset.height,
              isEdited: asset.isEdited,
            },
            edit: edits,
          });
        }

        break;
      }

      case JobName.AssetGenerateThumbnails: {
        if (!item.data.notify && item.data.source !== 'upload') {
          break;
        }

        const [asset] = await this.assetRepository.getByIdsWithAllRelationsButStacks([item.data.id]);
        if (!asset) {
          this.logger.warn(`Could not find asset ${item.data.id} after generating thumbnails`);
          break;
        }

        const jobs: JobItem[] = [
          { name: JobName.SmartSearch, data: item.data },
          { name: JobName.AssetDetectFaces, data: item.data },
          { name: JobName.Ocr, data: item.data },
        ];

        if (asset.type === AssetType.Video) {
          jobs.push({ name: JobName.AssetEncodeVideo, data: item.data });
        }

        await this.jobRepository.queueAll(jobs);
        if (asset.visibility === AssetVisibility.Timeline || asset.visibility === AssetVisibility.Archive) {
          this.websocketRepository.clientSend('on_upload_success', asset.ownerId, mapAsset(asset));
          if (asset.exifInfo) {
            const exif = asset.exifInfo;
            this.websocketRepository.clientSend('AssetUploadReadyV2', asset.ownerId, {
              // TODO remove `on_upload_success` and then modify the query to select only the required fields)
              asset: {
                id: asset.id,
                ownerId: asset.ownerId,
                originalFileName: asset.originalFileName,
                thumbhash: asset.thumbhash ? hexOrBufferToBase64(asset.thumbhash) : null,
                checksum: hexOrBufferToBase64(asset.checksum),
                fileCreatedAt: asset.fileCreatedAt,
                fileModifiedAt: asset.fileModifiedAt,
                createdAt: asset.createdAt,
                localDateTime: asset.localDateTime,
                duration: asset.duration,
                type: asset.type,
                deletedAt: asset.deletedAt,
                isFavorite: asset.isFavorite,
                visibility: asset.visibility,
                livePhotoVideoId: asset.livePhotoVideoId,
                stackId: asset.stackId,
                libraryId: asset.libraryId,
                width: asset.width,
                height: asset.height,
                isEdited: asset.isEdited,
              },
              exif: {
                assetId: exif.assetId,
                description: exif.description,
                exifImageWidth: exif.exifImageWidth,
                exifImageHeight: exif.exifImageHeight,
                fileSizeInByte: exif.fileSizeInByte,
                orientation: exif.orientation,
                dateTimeOriginal: exif.dateTimeOriginal ? new Date(exif.dateTimeOriginal) : null,
                modifyDate: exif.modifyDate ? new Date(exif.modifyDate) : null,
                timeZone: exif.timeZone,
                latitude: exif.latitude,
                longitude: exif.longitude,
                projectionType: exif.projectionType,
                city: exif.city,
                state: exif.state,
                country: exif.country,
                make: exif.make,
                model: exif.model,
                lensModel: exif.lensModel,
                fNumber: exif.fNumber,
                focalLength: exif.focalLength,
                iso: exif.iso,
                exposureTime: exif.exposureTime,
                profileDescription: exif.profileDescription,
                rating: exif.rating,
                fps: exif.fps,

                // Extra & Brand-Specific EXIF fields
                actionsDescription: exif.actionsDescription,
                actionsSoftwareAgentName: exif.actionsSoftwareAgentName,
                afAreaMode: exif.afAreaMode,
                afAreaModeSetting: exif.afAreaModeSetting,
                afMode: exif.afMode,
                afPointPosition: exif.afPointPosition,
                afSubjectDetection: exif.afSubjectDetection,
                ambientTemperature: exif.ambientTemperature,
                autoISO: exif.autoISO,
                brightness: exif.brightness,
                cameraTemperature: exif.cameraTemperature,
                cameraType: exif.cameraType,
                canonExposureMode: exif.canonExposureMode,
                claimGeneratorInfoName: exif.claimGeneratorInfoName,
                clarity: exif.clarity,
                colorChromeEffect: exif.colorChromeEffect,
                colorChromeFXBlue: exif.colorChromeFXBlue,
                colorTempKelvin: exif.colorTempKelvin,
                colorTemperature: exif.colorTemperature,
                colorTone: exif.colorTone,
                continuousDrive: exif.continuousDrive,
                contrast: exif.contrast,
                creatorTool: exif.creatorTool,
                customRendered: exif.customRendered,
                developmentDynamicRange: exif.developmentDynamicRange,
                driveMode: exif.driveMode,
                dynamicRange: exif.dynamicRange,
                electronicFrontCurtainShutter: exif.electronicFrontCurtainShutter,
                exifVersion: exif.exifVersion,
                exposureCompensation: exif.exposureCompensation,
                exposureMode: exif.exposureMode,
                exposureProgram: exif.exposureProgram,
                facesDetected: exif.facesDetected,
                fade: exif.fade,
                fileFormat: exif.fileFormat,
                filmMode: exif.filmMode,
                flash: exif.flash,
                flashAction: exif.flashAction,
                focusLocation: exif.focusLocation,
                focusMode: exif.focusMode,
                focusMode2: exif.focusMode2,
                focusPixel: exif.focusPixel,
                grainEffectRoughness: exif.grainEffectRoughness,
                grainEffectSize: exif.grainEffectSize,
                highlightTone: exif.highlightTone,
                highlights: exif.highlights,
                historySoftwareAgent: exif.historySoftwareAgent,
                imageQuality: exif.imageQuality,
                imageStabilization: exif.imageStabilization,
                jpegQuality: exif.jpegQuality,
                lut1Name: exif.lut1Name,
                lut1Opacity: exif.lut1Opacity,
                lut2Name: exif.lut2Name,
                lut2Opacity: exif.lut2Opacity,
                meteringMode: exif.meteringMode,
                monochromeGrainEffect: exif.monochromeGrainEffect,
                mpImageLength: exif.mpImageLength,
                noiseReduction: exif.noiseReduction,
                numberOfImages: exif.numberOfImages,
                pictureEffect: exif.pictureEffect,
                pictureMode: exif.pictureMode,
                pictureStyle: exif.pictureStyle,
                pitchAngle: exif.pitchAngle,
                quality: exif.quality,
                releaseMode: exif.releaseMode,
                rollAngle: exif.rollAngle,
                saturation: exif.saturation,
                sceneCaptureType: exif.sceneCaptureType,
                sensitivityType: exif.sensitivityType,
                shadowTone: exif.shadowTone,
                shadows: exif.shadows,
                sharpness: exif.sharpness,
                sharpnessRange: exif.sharpnessRange,
                shootingMode: exif.shootingMode,
                shutter: exif.shutter,
                shutterType: exif.shutterType,
                software: exif.software,
                userComment: exif.userComment,
                wbShiftAB: exif.wbShiftAB,
                wbShiftGM: exif.wbShiftGM,
                whiteBalance: exif.whiteBalance,
                whiteBalanceFineTune: exif.whiteBalanceFineTune,
              },
            });
          }
        }

        break;
      }

      case JobName.SmartSearch: {
        if (item.data.source === 'upload') {
          await this.jobRepository.queue({ name: JobName.AssetDetectDuplicates, data: item.data });
        }
        break;
      }

      // no default
    }
  }
}
