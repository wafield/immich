import { DateTime } from 'luxon';
import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
import { formatUtcOffset } from '$lib/utils/date-time';
import { fromISODateTime, fromISODateTimeUTC, fromTimelinePlainDateTime } from '$lib/utils/timeline-util';

export const getAssetDateTime = (asset: TimelineAsset): { dt: DateTime; hasExplicitZone: boolean } | null => {
  try {
    const timeZone = asset.timeZone ?? undefined;
    let dt: DateTime | null = null;
    if (timeZone && asset.dateTimeOriginal) {
      dt =
        typeof asset.dateTimeOriginal === 'string'
          ? fromISODateTime(asset.dateTimeOriginal, timeZone)
          : fromTimelinePlainDateTime(asset.dateTimeOriginal).setZone(timeZone);
    } else if (asset.localDateTime) {
      dt =
        typeof asset.localDateTime === 'string'
          ? fromISODateTimeUTC(asset.localDateTime)
          : fromTimelinePlainDateTime(asset.localDateTime);
    }
    if (dt && dt.isValid) {
      return { dt, hasExplicitZone: Boolean(timeZone) };
    }
  } catch {
    return null;
  }
  return null;
};

export const formatDateTime = (asset: TimelineAsset): string => {
  const result = getAssetDateTime(asset);
  return result ? result.dt.toFormat('HH:mm:ss') : '';
};

export const formatFullDateTime = (asset: TimelineAsset): string => {
  const result = getAssetDateTime(asset);
  if (!result) {
    return '';
  }
  const { dt, hasExplicitZone } = result;
  const dateFormatted = dt.toFormat('MM-dd HH:mm:ss');
  if (!hasExplicitZone) {
    return dateFormatted;
  }
  return `${dateFormatted} ${formatUtcOffset(dt)}`;
};
