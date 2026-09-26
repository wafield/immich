import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
import { isValidLatLng } from '$lib/utils';
import type { AssetResponseDto } from '@immich/sdk';

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

/**
 * Returns the latitude and longitude coordinates of an asset if valid, or null.
 * Checks both direct latitude/longitude (e.g. on TimelineAsset) and exifInfo (e.g. on AssetResponseDto).
 */
export const getAssetCoordinates = (
  asset: TimelineAsset | AssetResponseDto | { latitude?: number | null; longitude?: number | null; exifInfo?: { latitude?: number | null; longitude?: number | null } | null },
): GeoCoordinate | null => {
  const lat = asset.latitude ?? (asset as { exifInfo?: { latitude?: number | null } }).exifInfo?.latitude;
  const lng = asset.longitude ?? (asset as { exifInfo?: { longitude?: number | null } }).exifInfo?.longitude;
  if (isValidLatLng(lat, lng)) {
    return { lat: Number(lat), lng: Number(lng) };
  }
  return null;
};

/**
 * Calculates the geographic centroid (center of mass) of a collection of latitude/longitude coordinates on a sphere.
 * Returns null if the points array is empty.
 */
export const calculateCentroid = (points: GeoCoordinate[]): GeoCoordinate | null => {
  if (points.length === 0) {
    return null;
  }
  if (points.length === 1) {
    return { lat: points[0].lat, lng: points[0].lng };
  }

  let x = 0;
  let y = 0;
  let z = 0;

  for (const p of points) {
    const latRad = (p.lat * Math.PI) / 180;
    const lngRad = (p.lng * Math.PI) / 180;
    x += Math.cos(latRad) * Math.cos(lngRad);
    y += Math.cos(latRad) * Math.sin(lngRad);
    z += Math.sin(latRad);
  }

  const total = points.length;
  x /= total;
  y /= total;
  z /= total;

  const centralLng = Math.atan2(y, x);
  const centralSquareRoot = Math.sqrt(x * x + y * y);
  const centralLat = Math.atan2(z, centralSquareRoot);

  return {
    lat: Number(((centralLat * 180) / Math.PI).toFixed(7)),
    lng: Number(((centralLng * 180) / Math.PI).toFixed(7)),
  };
};
