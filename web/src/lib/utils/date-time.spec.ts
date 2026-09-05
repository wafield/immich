import { DateTime } from 'luxon';
import { writable } from 'svelte/store';
import { locale } from '$lib/stores/preferences.store';
import { getAlbumDateRange, getRelativeTime, getShortDateRange, formatUtcOffset } from './date-time';

vitest.mock('$lib/stores/preferences.store', () => ({
  locale: writable('en'),
}));

describe('getShortDateRange', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'UTC');
    locale.set('en');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    locale.set('en');
  });

  it('should correctly return long month if start and end date are within the same month', () => {
    expect(getShortDateRange('2022-01-01T00:00:00.000Z', '2022-01-31T00:00:00.000Z')).toEqual('January 2022');
  });

  it('should correctly return month range if start and end date are in separate months within the same year', () => {
    expect(getShortDateRange('2022-01-01T00:00:00.000Z', '2022-02-01T00:00:00.000Z')).toEqual('Jan – Feb 2022');
  });

  it('should correctly return range if start and end date are in separate months and years', () => {
    expect(getShortDateRange('2021-12-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z')).toEqual('Dec 2021 – Jan 2022');
  });

  it('should correctly return long month if start and end date are within the same month, ignoring local time zone', () => {
    vi.stubEnv('TZ', 'UTC+6');
    expect(getShortDateRange('2022-01-01T00:00:00.000Z', '2022-01-31T00:00:00.000Z')).toEqual('January 2022');
  });

  it('should correctly return long month if start and end date are within the same month, ignoring local time zone', () => {
    vi.stubEnv('TZ', 'UTC-6');
    expect(getShortDateRange('2022-01-01T00:00:00.000Z', '2022-01-31T00:00:00.000Z')).toEqual('January 2022');
  });

  it('should correctly return month range if start and end date are in separate months within the same year, ignoring local time zone', () => {
    vi.stubEnv('TZ', 'UTC+6');
    expect(getShortDateRange('2022-01-01T00:00:00.000Z', '2022-02-01T00:00:00.000Z')).toEqual('Jan – Feb 2022');
  });

  it('should correctly return range if start and end date are in separate months and years, ignoring local time zone', () => {
    vi.stubEnv('TZ', 'UTC+6');
    expect(getShortDateRange('2021-12-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z')).toEqual('Dec 2021 – Jan 2022');
  });

  it('should correctly return range if start and end date are in separate months and years, ignoring local time zone', () => {
    vi.stubEnv('TZ', 'UTC-6');
    expect(getShortDateRange('2021-12-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z')).toEqual('Dec 2021 – Jan 2022');
  });

  it('should use the correct locale to return month range', () => {
    locale.set('fr');
    expect(getShortDateRange('2022-01-01T00:00:00.000Z', '2022-02-01T00:00:00.000Z')).toEqual('janv.–févr. 2022');
  });

  it('should use the correct locale to return month-year range', () => {
    locale.set('fr');
    expect(getShortDateRange('2021-12-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z')).toEqual('déc. 2021 – janv. 2022');
  });
});

describe('getAlbumDateRange', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'UTC');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('should work', () => {
    expect(getAlbumDateRange('2021-01-01T00:00:00Z', '2021-01-05T00:00:00Z')).toEqual('Jan 1 – 5, 2021');
  });

  it('should work with a single day range', () => {
    expect(getAlbumDateRange('2021-01-01T09:00:00Z', '2021-01-01T10:00:00Z')).toEqual('Jan 1, 2021');
  });

  it('should use the proper locale', () => {
    locale.set('fr');
    expect(getAlbumDateRange('2020-03-26T12:00:00Z', '2021-12-01T00:00:00Z')).toEqual('26 mars 2020 – 1 déc. 2021');
    locale.set('en');
  });

  it('should correctly return range if start and end date are in separate months and years, ignoring local time zone', () => {
    vi.stubEnv('TZ', 'UTC+6');
    expect(getAlbumDateRange('2021-12-01T00:00:00Z', '2022-01-01T00:00:00Z')).toEqual('Dec 1, 2021 – Jan 1, 2022');
  });

  it('should correctly return range if start and end date are in separate months and years, ignoring local time zone', () => {
    vi.stubEnv('TZ', 'UTC-6');
    expect(getAlbumDateRange('2021-12-01T00:00:00Z', '2022-01-01T00:00:00Z')).toEqual('Dec 1, 2021 – Jan 1, 2022');
  });
});

describe('getRelativeTime', () => {
  const base = DateTime.fromISO('2023-06-15T12:00:00.000Z');

  beforeEach(() => {
    locale.set('en');
  });

  it('returns empty string for invalid date', () => {
    expect(getRelativeTime('invalid-date', undefined, { base })).toEqual('');
  });

  it('formats seconds ago (now)', () => {
    expect(getRelativeTime('2023-06-15T12:00:00.000Z', undefined, { base })).toEqual('now');
  });

  it('formats minutes ago', () => {
    expect(getRelativeTime('2023-06-15T11:55:00.000Z', undefined, { base })).toEqual('5 minutes ago');
  });

  it('formats hours ago', () => {
    expect(getRelativeTime('2023-06-15T10:00:00.000Z', undefined, { base })).toEqual('2 hours ago');
  });

  it('formats yesterday', () => {
    expect(getRelativeTime('2023-06-14T12:00:00.000Z', undefined, { base })).toEqual('yesterday');
  });

  it('formats days ago', () => {
    expect(getRelativeTime('2023-06-12T12:00:00.000Z', undefined, { base })).toEqual('3 days ago');
  });

  it('formats weeks ago', () => {
    expect(getRelativeTime('2023-06-01T12:00:00.000Z', undefined, { base })).toEqual('2 weeks ago');
  });

  it('formats last month and months ago', () => {
    expect(getRelativeTime('2023-05-15T12:00:00.000Z', undefined, { base })).toEqual('last month');
    expect(getRelativeTime('2023-03-15T12:00:00.000Z', undefined, { base })).toEqual('3 months ago');
  });

  it('formats last year and years ago', () => {
    expect(getRelativeTime('2022-06-15T12:00:00.000Z', undefined, { base })).toEqual('last year');
    expect(getRelativeTime('2020-06-15T12:00:00.000Z', undefined, { base })).toEqual('3 years ago');
  });

  it('respects the active locale store', () => {
    locale.set('fr');
    expect(getRelativeTime('2023-06-12T12:00:00.000Z', undefined, { base })).toEqual('il y a 3 jours');
  });

  it('respects explicitly passed targetLocale', () => {
    expect(getRelativeTime('2023-06-12T12:00:00.000Z', 'de', { base })).toEqual('vor 3 Tagen');
  });
});

describe('formatUtcOffset', () => {
  it('formats zero offset as UTC', () => {
    const dt = DateTime.fromISO('2026-01-20T15:14:19', { zone: 'UTC' });
    expect(formatUtcOffset(dt)).toBe('UTC');
  });

  it('formats whole positive offsets', () => {
    const dt = DateTime.fromISO('2026-01-20T15:14:19', { zone: 'Asia/Tokyo' });
    expect(formatUtcOffset(dt)).toBe('UTC+9');
  });

  it('formats whole negative offsets', () => {
    const dt = DateTime.fromISO('2026-01-20T15:14:19', { zone: 'America/New_York' });
    expect(formatUtcOffset(dt)).toBe('UTC-5');
  });

  it('formats fractional positive offsets', () => {
    const dt = DateTime.fromISO('2026-01-20T15:14:19', { zone: 'Asia/Kolkata' });
    expect(formatUtcOffset(dt)).toBe('UTC+5:30');
  });

  it('formats fractional negative offsets', () => {
    const dt = DateTime.fromISO('2026-01-20T15:14:19', { zone: 'America/St_Johns' });
    expect(formatUtcOffset(dt)).toBe('UTC-3:30');
  });

  it('formats 45-minute offsets', () => {
    const dt = DateTime.fromISO('2026-01-20T15:14:19', { zone: 'Asia/Kathmandu' });
    expect(formatUtcOffset(dt)).toBe('UTC+5:45');
  });
});
