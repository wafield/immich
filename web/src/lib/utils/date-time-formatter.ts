import { DateTime } from 'luxon';
import { formatUtcOffset } from '$lib/utils/date-time';
import {
  fromISODateTime,
  fromISODateTimeUTC,
  fromTimelinePlainDateTime,
  type TimelineDateTime,
} from '$lib/utils/timeline-util';

const toLuxonDateTime = (dateTime: TimelineDateTime | string, timeZone?: string | null): DateTime => {
  if (typeof dateTime === 'string') {
    return timeZone ? fromISODateTime(dateTime, timeZone) : fromISODateTimeUTC(dateTime);
  }
  return timeZone ? DateTime.fromObject(dateTime, { zone: timeZone }) : fromTimelinePlainDateTime(dateTime);
};

export const formatDateTime = (dateTime: TimelineDateTime | string, timeZone?: string | null): string => {
  const dt = toLuxonDateTime(dateTime, timeZone);
  return dt.toFormat('HH:mm:ss');
};

export const formatFullDateTime = (dateTime: TimelineDateTime | string, timeZone?: string | null): string => {
  const dt = toLuxonDateTime(dateTime, timeZone);
  const dateFormatted = dt.toFormat('MM-dd HH:mm:ss');
  return timeZone ? `${dateFormatted} ${formatUtcOffset(dt)}` : dateFormatted;
};

