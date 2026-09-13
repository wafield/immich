import { DateTime } from 'luxon';
import { formatUtcOffset } from '$lib/utils/date-time';
import { fromTimelinePlainDateTime, type TimelineDateTime } from '$lib/utils/timeline-util';

export const formatDateTime = (dateTime: TimelineDateTime, timeZone?: string | null): string => {
  const dt = timeZone ? DateTime.fromObject(dateTime, { zone: timeZone }) : fromTimelinePlainDateTime(dateTime);
  return dt.toFormat('HH:mm:ss');
};

export const formatFullDateTime = (dateTime: TimelineDateTime, timeZone?: string | null): string => {
  const dt = timeZone ? DateTime.fromObject(dateTime, { zone: timeZone }) : fromTimelinePlainDateTime(dateTime);
  const dateFormatted = dt.toFormat('MM-dd HH:mm:ss');
  return timeZone ? `${dateFormatted} ${formatUtcOffset(dt)}` : dateFormatted;
};
