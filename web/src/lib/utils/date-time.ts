import { DateTime } from 'luxon';
import { get } from 'svelte/store';
import { dateFormats } from '$lib/constants';
import { locale } from '$lib/stores/preferences.store';

export function parseUtcDate(date: string) {
  return DateTime.fromISO(date, { zone: 'UTC' }).toUTC();
}

const getDateRange = (startTimestamp: string, endTimestamp: string, format: 'short' | 'long') => {
  // We don't need to check if the locale is set/nonempty. MDN's Intl docs:
  // "If the application doesn't provide a locales argument, or the runtime doesn't have a locale that matches the request, then the runtime's default locale is used."
  const userLocale = get(locale);
  const startDate = DateTime.fromISO(startTimestamp).setZone('UTC');
  const endDate = DateTime.fromISO(endTimestamp).setZone('UTC');

  if (startDate.year === endDate.year && startDate.month === endDate.month && format === 'short') {
    return endDate.setLocale(userLocale).toLocaleString({ month: 'long', year: 'numeric' });
  }

  const formatter = new Intl.DateTimeFormat(
    userLocale,
    format === 'short' ? dateFormats.albumShort : dateFormats.album,
  );
  return formatter.formatRange(startDate.toJSDate(), endDate.toJSDate());
};

/**
 * Get localized date range in short format like 'Oct – Nov 2026', with full month if start and end are the same: 'October 2026'.
 * Timestamps are expected to be date-only in UTC.
 */
export const getShortDateRange = (start: string, end: string) => getDateRange(start, end, 'short');

/**
 * Get localized date range in long format. Timestamps are expected to be date-only in UTC.
 */
export const getAlbumDateRange = (start: string, end: string) => getDateRange(start, end, 'long');

/**
 * Use this to convert from "5pm EST" to "5pm UTC"
 *
 * Useful with some APIs where you want to query by "today", but the values in the database are stored as UTC
 */
export const asLocalTimeISO = (date: DateTime<true>) =>
  (date.setZone('utc', { keepLocalTime: true }) as DateTime<true>).toISO();

const relativeTimeUnits: Intl.RelativeTimeFormatUnit[] = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];

/**
 * Get relative date time string using standard Intl.RelativeTimeFormat.
 * Supports ISO string, JS Date, or Luxon DateTime.
 */
export const getRelativeTime = (
  timestamp: string | Date | DateTime,
  targetLocale?: string,
  options?: { base?: DateTime; numeric?: 'always' | 'auto' },
): string => {
  const userLocale = targetLocale ?? get(locale);
  const date =
    typeof timestamp === 'string'
      ? DateTime.fromISO(timestamp)
      : timestamp instanceof Date
        ? DateTime.fromJSDate(timestamp)
        : timestamp;

  if (!date.isValid) {
    return '';
  }

  const base = options?.base ?? DateTime.now();
  const numeric = options?.numeric ?? 'auto';

  const diff = date.diff(base).shiftTo(...relativeTimeUnits);
  const unit = relativeTimeUnits.find((u) => diff.get(u) !== 0) || 'second';

  const formatter = new Intl.RelativeTimeFormat(userLocale, { numeric });
  return formatter.format(Math.trunc(diff.as(unit)), unit);
};

/**
 * Formats a DateTime's UTC offset into 'UTC', 'UTC+H', 'UTC-H', or 'UTC±H:MM'.
 * Examples:
 * - offset 0 min -> 'UTC'
 * - offset +540 min (+9h) -> 'UTC+9'
 * - offset -300 min (-5h) -> 'UTC-5'
 * - offset +330 min (+5.5h) -> 'UTC+5:30'
 * - offset -210 min (-3.5h) -> 'UTC-3:30'
 */
export const formatUtcOffset = (dt: DateTime): string => {
  const offsetMinutes = dt.offset;
  if (offsetMinutes === 0) {
    return 'UTC';
  }
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return minutes > 0 ? `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}` : `UTC${sign}${hours}`;
};
