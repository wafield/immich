import { AssetResponseDto } from 'src/dtos/asset-response.dto';

/**
 * Counts all truthy values in the exifInfo object.
 * This matches the client implementation in web/src/lib/utils/exif-utils.ts
 *
 * @param asset Asset with optional exifInfo
 * @returns Count of truthy EXIF values
 */
export const getExifCount = (asset: AssetResponseDto): number => {
  return Object.values(asset.exifInfo ?? {}).filter(Boolean).length;
};

/**
 * Suggests the best duplicate asset to keep from a list of duplicates.
 *
 * The best asset is determined by the following criteria:
 *  1. If assets are from different libraries, keep the asset whose library was created most recently.
 *  2. If they are from the same library, keep the asset whose original path does NOT contain "selected".
 *  3. Fall back to largest file size, then largest EXIF count.
 *
 * @param assets List of duplicate assets
 * @param libraryCreatedMap Optional map of libraryId -> library creation timestamp/Date
 * @returns The best asset to keep, or undefined if empty list
 */
export const suggestDuplicate = (
  assets: AssetResponseDto[],
  libraryCreatedMap: Record<string, Date | string> = {},
): AssetResponseDto | undefined => {
  if (assets.length === 0) {
    return undefined;
  }

  let duplicateAssets = [...assets];

  // 1. If assets come from different libraries, keep the one whose library is created most recently.
  const getLibraryCreatedAt = (asset: AssetResponseDto): number => {
    if (!asset.libraryId) {
      return 0;
    }
    const createdAt = libraryCreatedMap[asset.libraryId];
    return createdAt ? new Date(createdAt).getTime() : 0;
  };

  const uniqueLibraryIds = new Set(duplicateAssets.map((a) => a.libraryId).filter(Boolean));
  if (uniqueLibraryIds.size > 1) {
    const maxCreatedAt = Math.max(...duplicateAssets.map(getLibraryCreatedAt));
    duplicateAssets = duplicateAssets.filter((asset) => getLibraryCreatedAt(asset) === maxCreatedAt);
  }

  // 2. Look at originalPath, and keep the asset whose original path does NOT contain a "selected" substring.
  if (duplicateAssets.length >= 2) {
    const withoutSelected = duplicateAssets.filter(
      (asset) => !asset.originalPath || !asset.originalPath.toLowerCase().includes('selected'),
    );
    if (withoutSelected.length > 0 && withoutSelected.length < duplicateAssets.length) {
      duplicateAssets = withoutSelected;
    }
  }

  // 3. Fall back to existing file size and EXIF count logic.
  if (duplicateAssets.length >= 2) {
    // Sort by file size ascending (smallest first)
    duplicateAssets = duplicateAssets.toSorted(
      (a, b) => (a.exifInfo?.fileSizeInByte ?? 0) - (b.exifInfo?.fileSizeInByte ?? 0),
    );

    // Get the largest file size (last element after sorting)
    const largestFileSize = duplicateAssets.at(-1)?.exifInfo?.fileSizeInByte ?? 0;

    // Filter to keep only assets with the largest file size
    duplicateAssets = duplicateAssets.filter((asset) => (asset.exifInfo?.fileSizeInByte ?? 0) === largestFileSize);

    // If there are multiple assets with the same file size, sort by EXIF count
    if (duplicateAssets.length >= 2) {
      duplicateAssets = duplicateAssets.toSorted((a, b) => getExifCount(a) - getExifCount(b));
    }
  }

  // Return the last asset
  return duplicateAssets.at(-1);
};

/**
 * Suggests the best duplicate asset IDs to keep from a list of duplicates.
 * Returns an array with a single asset ID (the best candidate), or empty if no assets.
 *
 * @param assets List of duplicate assets
 * @param libraryCreatedMap Optional map of libraryId -> library creation timestamp/Date
 * @returns Array of suggested asset IDs to keep (0 or 1 element)
 */
export const suggestDuplicateKeepAssetIds = (
  assets: AssetResponseDto[],
  libraryCreatedMap: Record<string, Date | string> = {},
): string[] => {
  const suggested = suggestDuplicate(assets, libraryCreatedMap);
  return suggested ? [suggested.id] : [];
};
