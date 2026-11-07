<script lang="ts">
  import { shortcuts } from '#lib/actions/shortcut.ts';
  import UserPageLayout from '#lib/components/layouts/UserPageLayout.svelte';
  import { assetViewerManager } from '#lib/managers/asset-viewer-manager.svelte.ts';
  import { languageManager } from '#lib/managers/language-manager.svelte.ts';
  import { createPreloadedQuery, executeMutation } from '#lib/queries/client.ts';
  import { getUserConfigQuery } from '#lib/queries/config-user.query.ts';
  import {
    getAssetDuplicatesQuery,
    removeDuplicateGroups,
    resolveDuplicatesMutation,
  } from '#lib/queries/duplicate.query.ts';
  import { createStackMutation } from '#lib/queries/stack.query.ts';
  import { Route } from '#lib/route.ts';
  import { locale } from '#lib/stores/preferences.store.ts';
  import { handleError } from '#lib/utils/handle-error.ts';
  import { updateAssets, type AssetResponseDto } from '@immich/sdk';
  import { Button, modalManager, toastManager } from '@immich/ui';
  import { mdiChevronLeft, mdiChevronRight, mdiPageFirst, mdiPageLast } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import DuplicatesCompareControl from './DuplicatesCompareControl.svelte';

  const queries = {
    config: createPreloadedQuery(getUserConfigQuery),
    duplicates: createPreloadedQuery(getAssetDuplicatesQuery),
  };
  const config = $derived(queries.config.data);
  const duplicates = $derived(queries.duplicates.data);

  let showMore = $state(false);

  const correctDuplicatesIndex = (index: number) => {
    return Math.max(0, Math.min(index, duplicates.length - 1));
  };

  let duplicatesIndex = $derived(
    (() => {
      const indexParam = page.url.searchParams.get('index') ?? '0';
      const parsedIndex = Math.trunc(Number(indexParam));
      return correctDuplicatesIndex(Number.isNaN(parsedIndex) ? 0 : parsedIndex);
    })(),
  );

  const withConfirmation = async (callback: () => Promise<void>, prompt?: string, confirmText?: string) => {
    if (prompt && confirmText) {
      const isConfirmed = await modalManager.showDialog({ prompt, confirmText });
      if (!isConfirmed) {
        return;
      }
    }

    return callback();
  };

  const deletedNotification = (trashedCount: number) => {
    if (!trashedCount) {
      return;
    }

    const message = config.trash.enabled
      ? $t('assets_moved_to_trash_count', { values: { count: trashedCount } })
      : $t('permanently_deleted_assets_count', { values: { count: trashedCount } });
    toastManager.primary(message);
  };

  const handleResolve = async (duplicateId: string, duplicateAssetIds: string[], trashIds: string[]) => {
    const forceDelete = !config.trash.enabled;
    const shouldConfirmDelete = trashIds.length > 0 && forceDelete;

    return withConfirmation(
      async () => {
        const keepAssetIds = duplicateAssetIds.filter((id) => !trashIds.includes(id));

        await executeMutation(
          resolveDuplicatesMutation,
          [{ duplicateResolveDto: { groups: [{ duplicateId, keepAssetIds, trashAssetIds: trashIds }] } }],
          {
            onSuccess: ([{ success, error, errorMessage = error }]) => {
              if (!success) {
                handleError(new Error(errorMessage), $t('errors.unable_to_resolve_duplicate'));
                return;
              }

              deletedNotification(trashIds.length);
              void navigateToIndex(duplicatesIndex);
            },
          },
        );
      },
      shouldConfirmDelete ? $t('delete_duplicates_confirmation') : undefined,
      shouldConfirmDelete ? $t('permanently_delete') : undefined,
    );
  };

  const handleStack = async (duplicateId: string, assets: AssetResponseDto[]) => {
    const assetIds = assets.map((asset) => asset.id);
    await executeMutation(createStackMutation, [{ stackCreateDto: { assetIds, stackType: 'duplicate' } }], {
      onSuccess: () => void handleStacked(duplicateId, assetIds),
    });
  };

  const handleStacked = async (duplicateId: string, assetIds: string[]) => {
    await updateAssets({ assetBulkUpdateDto: { ids: assetIds, duplicateId: null } });
    removeDuplicateGroups([duplicateId]);
    await navigateToIndex(duplicatesIndex);
  };

  const handleFirst = () => navigateToIndex(0);
  const handlePrevious = () => navigateToIndex(Math.max(duplicatesIndex - 1, 0));
  const handleNext = async () => navigateToIndex(Math.min(duplicatesIndex + 1, duplicates.length - 1));
  const handleLast = () => navigateToIndex(duplicates.length - 1);

  const navigateToIndex = async (index: number) =>
    goto(Route.duplicatesUtility({ index: correctDuplicatesIndex(index) }));
</script>

<svelte:document
  use:shortcuts={assetViewerManager.isViewing
    ? []
    : [
        { shortcut: { key: 'ArrowLeft' }, onShortcut: handlePrevious },
        { shortcut: { key: 'ArrowRight' }, onShortcut: handleNext },
      ]}
/>

<UserPageLayout scrollbar={true}>
  {#if duplicates && duplicates.length > 0}
    {#key duplicates[duplicatesIndex].duplicateId}
      <DuplicatesCompareControl
        assets={duplicates[duplicatesIndex].assets}
        suggestedKeepAssetIds={duplicates[duplicatesIndex].suggestedKeepAssetIds}
        bind:showMore
        onResolve={(duplicateAssetIds, trashIds) =>
          handleResolve(duplicates[duplicatesIndex].duplicateId, duplicateAssetIds, trashIds)}
        onStack={(assets) => handleStack(duplicates[duplicatesIndex].duplicateId, assets)}
      />
      <div class="mx-auto p-2 mb-16 flex w-full place-content-center place-items-center items-center justify-between">
        <div class="flex text-xs text-black">
          <Button
            size="small"
            leadingIcon={languageManager.rtl ? mdiPageLast : mdiPageFirst}
            color="primary"
            class="flex place-items-center gap-2 rounded-s-full px-2 sm:px-4"
            onclick={handleFirst}
            disabled={duplicatesIndex === 0}
          >
            {$t('first')}
          </Button>
          <Button
            size="small"
            leadingIcon={languageManager.rtl ? mdiChevronRight : mdiChevronLeft}
            color="primary"
            class="flex place-items-center gap-2 rounded-e-full px-2 sm:px-4"
            onclick={handlePrevious}
            disabled={duplicatesIndex === 0}
          >
            {$t('previous')}
          </Button>
        </div>
        <p class="rounded-lg border px-3 py-1 text-xs md:px-6 md:text-sm dark:bg-subtle">
          {duplicatesIndex + 1} / {duplicates.length.toLocaleString($locale)}
        </p>
        <div class="flex text-xs text-black">
          <Button
            size="small"
            trailingIcon={languageManager.rtl ? mdiChevronLeft : mdiChevronRight}
            color="primary"
            class="flex place-items-center gap-2 rounded-s-full px-2 sm:px-4"
            onclick={handleNext}
            disabled={duplicatesIndex === duplicates.length - 1}
          >
            {$t('next')}
          </Button>
          <Button
            size="small"
            trailingIcon={languageManager.rtl ? mdiPageFirst : mdiPageLast}
            color="primary"
            class="flex place-items-center gap-2 rounded-e-full px-2 sm:px-4"
            onclick={handleLast}
            disabled={duplicatesIndex === duplicates.length - 1}
          >
            {$t('last')}
          </Button>
        </div>
      </div>
    {/key}
  {:else}
    <p class="flex place-content-center place-items-center text-center text-lg dark:text-white">
      {$t('no_duplicates_found')}
    </p>
  {/if}
</UserPageLayout>
