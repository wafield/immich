import { getAssetDuplicates } from '@immich/sdk';
import { authenticate } from '$lib/utils/auth';
import { getFormatter } from '$lib/utils/i18n';
import type { PageLoad } from './$types';

export const load = (async ({ url }) => {
  await authenticate(url);
  const duplicates = await getAssetDuplicates();
  
  for (const group of duplicates) {
    if (group.assets && group.assets.length >= 2) {
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

  const $t = await getFormatter();

  return {
    duplicates,
    meta: {
      title: $t('duplicates'),
    },
  };
}) satisfies PageLoad;
