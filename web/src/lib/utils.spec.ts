import { AssetTypeEnum } from '@immich/sdk';
import { getAssetUrl, isValidLatLng, IsValidLatLng, isValidMapHash, semverToName } from '$lib/utils';
import { assetFactory } from '@test-data/factories/asset-factory';
import { sharedLinkFactory } from '@test-data/factories/shared-link-factory';

describe('utils', () => {
  describe(getAssetUrl.name, () => {
    it('should return thumbnail URL for static images', () => {
      const asset = assetFactory.build({
        originalPath: 'image.jpg',
        originalMimeType: 'image/jpeg',
        type: AssetTypeEnum.Image,
      });

      const url = getAssetUrl({ asset });

      // Should return a thumbnail URL (contains /thumbnail)
      expect(url).toContain('/thumbnail');
      expect(url).toContain(asset.id);
    });

    it('should return thumbnail URL for static gifs', () => {
      const asset = assetFactory.build({
        originalPath: 'image.gif',
        originalMimeType: 'image/gif',
        type: AssetTypeEnum.Image,
      });

      const url = getAssetUrl({ asset });

      expect(url).toContain('/thumbnail');
      expect(url).toContain(asset.id);
    });

    it('should return thumbnail URL for static webp images', () => {
      const asset = assetFactory.build({
        originalPath: 'image.webp',
        originalMimeType: 'image/webp',
        type: AssetTypeEnum.Image,
      });

      const url = getAssetUrl({ asset });

      expect(url).toContain('/thumbnail');
      expect(url).toContain(asset.id);
    });

    it('should return original URL for animated gifs', () => {
      const asset = assetFactory.build({
        originalPath: 'image.gif',
        originalMimeType: 'image/gif',
        type: AssetTypeEnum.Image,
        duration: 2000,
      });

      const url = getAssetUrl({ asset });

      // Should return original URL (contains /original)
      expect(url).toContain('/original');
      expect(url).toContain(asset.id);
    });

    it('should return original URL for animated webp images', () => {
      const asset = assetFactory.build({
        originalPath: 'image.webp',
        originalMimeType: 'image/webp',
        type: AssetTypeEnum.Image,
        duration: 2000,
      });

      const url = getAssetUrl({ asset });

      expect(url).toContain('/original');
      expect(url).toContain(asset.id);
    });

    it('should return original URL for video assets with forceOriginal', () => {
      const asset = assetFactory.build({
        originalPath: 'video.mp4',
        originalMimeType: 'video/mp4',
        type: AssetTypeEnum.Video,
      });

      const url = getAssetUrl({ asset, forceOriginal: true });

      expect(url).toContain('/original');
      expect(url).toContain(asset.id);
    });

    it('should return thumbnail URL for video assets without forceOriginal', () => {
      const asset = assetFactory.build({
        originalPath: 'video.mp4',
        originalMimeType: 'video/mp4',
        type: AssetTypeEnum.Video,
      });

      const url = getAssetUrl({ asset });

      expect(url).toContain('/thumbnail');
      expect(url).toContain(asset.id);
    });

    it('should return thumbnail URL for static images in shared link even with download and showMetadata permissions', () => {
      const asset = assetFactory.build({
        originalPath: 'image.gif',
        originalMimeType: 'image/gif',
        type: AssetTypeEnum.Image,
      });
      const sharedLink = sharedLinkFactory.build({ allowDownload: true, showMetadata: true, assets: [asset] });

      const url = getAssetUrl({ asset, sharedLink });

      expect(url).toContain('/thumbnail');
      expect(url).toContain(asset.id);
    });

    it('should return original URL for animated images in shared link with download and showMetadata permissions', () => {
      const asset = assetFactory.build({
        originalPath: 'image.gif',
        originalMimeType: 'image/gif',
        type: AssetTypeEnum.Image,
        duration: 2000,
      });
      const sharedLink = sharedLinkFactory.build({ allowDownload: true, showMetadata: true, assets: [asset] });

      const url = getAssetUrl({ asset, sharedLink });

      expect(url).toContain('/original');
      expect(url).toContain(asset.id);
    });

    it('should return thumbnail URL (not original) for animated images when shared link download permission is false', () => {
      const asset = assetFactory.build({
        originalPath: 'image.gif',
        originalMimeType: 'image/gif',
        type: AssetTypeEnum.Image,
        duration: 2000,
      });
      const sharedLink = sharedLinkFactory.build({ allowDownload: false, assets: [asset] });

      const url = getAssetUrl({ asset, sharedLink });

      expect(url).toContain('/thumbnail');
      expect(url).not.toContain('/original');
      expect(url).toContain(asset.id);
    });

    it('should return thumbnail URL (not original) for animated images when shared link showMetadata permission is false', () => {
      const asset = assetFactory.build({
        originalPath: 'image.gif',
        originalMimeType: 'image/gif',
        type: AssetTypeEnum.Image,
        duration: 2000,
      });
      const sharedLink = sharedLinkFactory.build({ showMetadata: false, assets: [asset] });

      const url = getAssetUrl({ asset, sharedLink });

      expect(url).toContain('/thumbnail');
      expect(url).not.toContain('/original');
      expect(url).toContain(asset.id);
    });
  });
  describe('semverToName', () => {
    it('should not append release candidate tag if prelease is not set', () => {
      expect(semverToName({ major: 3, minor: 0, patch: 0, prerelease: null })).toEqual('v3.0.0');
    });

    it('should append release candidate if set', () => {
      expect(semverToName({ major: 3, minor: 0, patch: 0, prerelease: 0 })).toEqual('v3.0.0-rc.0');
    });
  });

  describe(isValidLatLng.name, () => {
    it('should return true for valid coordinates', () => {
      expect(isValidLatLng(0, 0)).toBe(true);
      expect(isValidLatLng(37.7749, -122.4194)).toBe(true);
      expect(isValidLatLng(-90, 180)).toBe(true);
    });

    it('should return false if latitude or longitude is null', () => {
      expect(isValidLatLng(null, 10)).toBe(false);
      expect(isValidLatLng(10, null)).toBe(false);
      expect(isValidLatLng(null, null)).toBe(false);
    });

    it('should return false if latitude or longitude is undefined', () => {
      expect(isValidLatLng(undefined, 10)).toBe(false);
      expect(isValidLatLng(10, undefined)).toBe(false);
      expect(isValidLatLng(undefined, undefined)).toBe(false);
      expect(isValidLatLng()).toBe(false);
    });

    it('should return false if latitude or longitude is NaN', () => {
      expect(isValidLatLng(NaN, 10)).toBe(false);
      expect(isValidLatLng(10, NaN)).toBe(false);
      expect(isValidLatLng(NaN, NaN)).toBe(false);
    });

    it('should behave identically for IsValidLatLng alias', () => {
      expect(IsValidLatLng(37.7749, -122.4194)).toBe(true);
      expect(IsValidLatLng(null, 10)).toBe(false);
      expect(IsValidLatLng(10, NaN)).toBe(false);
    });
  });

  describe('isValidMapHash', () => {
    it('should return true for valid map hash strings', () => {
      expect(isValidMapHash('#6.8/48.432/-0.373')).toBe(true);
      expect(isValidMapHash('#15/37.75/-122.42')).toBe(true);
      expect(isValidMapHash('#15/37.75/-122.42/20/30')).toBe(true);
      expect(isValidMapHash('6.8/48.432/-0.373')).toBe(true);
    });

    it('should return false for invalid or missing map hashes', () => {
      expect(isValidMapHash(undefined)).toBe(false);
      expect(isValidMapHash(null)).toBe(false);
      expect(isValidMapHash('')).toBe(false);
      expect(isValidMapHash('#')).toBe(false);
      expect(isValidMapHash('#some-anchor')).toBe(false);
      expect(isValidMapHash('#6.8/48.432')).toBe(false);
      expect(isValidMapHash('#a/b/c')).toBe(false);
    });
  });
});
