import { asMutation, queryClient } from '#lib/queries/client.ts';
import { deleteDuplicates, getAssetDuplicates, resolveDuplicates } from '@immich/sdk';
import { queryOptions } from '@tanstack/svelte-query';

export const getAssetDuplicatesQuery = () =>
  queryOptions({
    queryKey: ['duplicates'],
    queryFn: async ({ signal }) => {
      const duplicates = await getAssetDuplicates({ signal });
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
      duplicates.sort((a, b) => {
        const pathA = a.assets?.[0]?.originalPath ?? '';
        const pathB = b.assets?.[0]?.originalPath ?? '';
        return pathA.localeCompare(pathB);
      });
      return duplicates;
    },
  });

export const removeDuplicateGroups = (ids: string[]) => {
  const removed = new Set(ids);
  queryClient.setQueryData(getAssetDuplicatesQuery().queryKey, (duplicates) =>
    duplicates?.filter(({ duplicateId }) => !removed.has(duplicateId)),
  );
};

export const resolveDuplicatesMutation = () =>
  asMutation(resolveDuplicates, {
    onSuccess: (results) => removeDuplicateGroups(results.filter(({ success }) => success).map(({ id }) => id)),
    meta: { error: { toast: 'errors.unable_to_resolve_duplicate' } },
  });

export const deleteDuplicatesMutation = () =>
  asMutation(deleteDuplicates, {
    onSuccess: (_, [{ bulkIdsDto }]) => removeDuplicateGroups(bulkIdsDto.ids),
    meta: { success: { toast: 'resolved_all_duplicates' }, error: { toast: 'errors.unable_to_resolve_duplicate' } },
  });
