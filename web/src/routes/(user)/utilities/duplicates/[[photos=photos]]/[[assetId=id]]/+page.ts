import { getAssetDuplicates } from '@immich/sdk';
import { authenticate } from '$lib/utils/auth';
import { getFormatter } from '$lib/utils/i18n';
import type { PageLoad } from './$types';

export const load = (async ({ url }) => {
  await authenticate(url);
  const duplicates = await getAssetDuplicates();

  for (const group of duplicates) {
    if (group.assets && group.assets.length >= 2) {
      // Order the assets in each duplicate group so that the suggested-to-keep asset is always at last.
      group.assets.sort((a, b) => {
        const isSuggestedA = group.suggestedKeepAssetIds?.includes(a.id) || false;
        const isSuggestedB = group.suggestedKeepAssetIds?.includes(b.id) || false;
        if (isSuggestedA !== isSuggestedB) {
          return isSuggestedA ? 1 : -1;
        }
        const libA = a.libraryId || '';
        const libB = b.libraryId || '';
        if (libA !== libB) {
          return libA.localeCompare(libB);
        }
        const sizeA = a.exifInfo?.fileSizeInByte || 0;
        const sizeB = b.exifInfo?.fileSizeInByte || 0;
        return sizeB - sizeA;
      });
    }
  }

  // Order all duplicates by their first asset's full path.
  duplicates.sort((a, b) => {
    const pathA = a.assets?.[0]?.originalPath ?? '';
    const pathB = b.assets?.[0]?.originalPath ?? '';
    return pathA.localeCompare(pathB);
  });

  const $t = await getFormatter();

  return {
    duplicates,
    meta: {
      title: $t('duplicates'),
    },
  };
}) satisfies PageLoad;
