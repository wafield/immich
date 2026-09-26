import { describe, expect, it } from 'vitest';
import { calculateCentroid, getAssetCoordinates } from './geo-utils';

describe('geo-utils', () => {
  describe('getAssetCoordinates', () => {
    it('returns null when asset has no coordinates', () => {
      expect(getAssetCoordinates({ latitude: null, longitude: null })).toBeNull();
      expect(getAssetCoordinates({})).toBeNull();
    });

    it('extracts direct latitude and longitude', () => {
      expect(getAssetCoordinates({ latitude: 37.7749, longitude: -122.4194 })).toEqual({
        lat: 37.7749,
        lng: -122.4194,
      });
    });

    it('extracts latitude and longitude from exifInfo if direct coords are missing', () => {
      expect(
        getAssetCoordinates({
          latitude: null,
          longitude: null,
          exifInfo: { latitude: 48.8566, longitude: 2.3522 },
        }),
      ).toEqual({
        lat: 48.8566,
        lng: 2.3522,
      });
    });

    it('returns null if coordinates are invalid or NaN', () => {
      expect(getAssetCoordinates({ latitude: NaN, longitude: 10 })).toBeNull();
    });
  });

  describe('calculateCentroid', () => {
    it('returns null for an empty array', () => {
      expect(calculateCentroid([])).toBeNull();
    });

    it('returns the exact coordinate for a single point', () => {
      expect(calculateCentroid([{ lat: 37.7749, lng: -122.4194 }])).toEqual({
        lat: 37.7749,
        lng: -122.4194,
      });
    });

    it('calculates the centroid of multiple coordinates', () => {
      const centroid = calculateCentroid([
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
      ]);
      expect(centroid).not.toBeNull();
      expect(centroid?.lat).toBeCloseTo(0, 4);
      expect(centroid?.lng).toBeCloseTo(5, 4);
    });
  });
});
