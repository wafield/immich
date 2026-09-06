<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { shortcuts } from '$lib/actions/shortcut';
  import UserPageLayout from '$lib/components/layouts/UserPageLayout.svelte';
  import DuplicatesCompareControl from './DuplicatesCompareControl.svelte';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
  import { Route } from '$lib/route';
  import { locale } from '$lib/stores/preferences.store';
  import { handleError } from '$lib/utils/handle-error';
  import type { AssetResponseDto } from '@immich/sdk';
  import { createStack, resolveDuplicates, updateAssets } from '@immich/sdk';
  import { Button, modalManager, toastManager } from '@immich/ui';
  import { mdiChevronLeft, mdiChevronRight, mdiPageFirst, mdiPageLast } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data = $bindable() }: Props = $props();

  let duplicates = $state(data.duplicates);
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

    try {
      return await callback();
    } catch (error) {
      handleError(error, $t('errors.unable_to_resolve_duplicate'));
    }
  };

  const deletedNotification = (trashedCount: number) => {
    if (!trashedCount) {
      return;
    }

    const message = featureFlagsManager.value.trash
      ? $t('assets_moved_to_trash_count', { values: { count: trashedCount } })
      : $t('permanently_deleted_assets_count', { values: { count: trashedCount } });
    toastManager.primary(message);
  };

  const handleResolve = async (duplicateId: string, duplicateAssetIds: string[], trashIds: string[]) => {
    const forceDelete = !featureFlagsManager.value.trash;
    const shouldConfirmDelete = trashIds.length > 0 && forceDelete;

    return withConfirmation(
      async () => {
        const keepAssetIds = duplicateAssetIds.filter((id) => !trashIds.includes(id));

        const response = await resolveDuplicates({
          duplicateResolveDto: {
            groups: [{ duplicateId, keepAssetIds, trashAssetIds: trashIds }],
          },
        });

        const { success, error, errorMessage } = response[0];
        if (!success) {
          throw new Error(errorMessage || error);
        }

        duplicates = duplicates.filter((duplicate) => duplicate.duplicateId !== duplicateId);

        deletedNotification(trashIds.length);
        await navigateToIndex(duplicatesIndex);
      },
      shouldConfirmDelete ? $t('delete_duplicates_confirmation') : undefined,
      shouldConfirmDelete ? $t('permanently_delete') : undefined,
    );
  };

  const handleStack = async (duplicateId: string, assets: AssetResponseDto[]) => {
    const assetIds = assets.map((asset) => asset.id);
    await createStack({ stackCreateDto: { assetIds, stackType: 'duplicate' } });
    await updateAssets({ assetBulkUpdateDto: { ids: assetIds, duplicateId: null } });
    duplicates = duplicates.filter((duplicate) => duplicate.duplicateId !== duplicateId);
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
            leadingIcon={mdiPageFirst}
            color="primary"
            class="flex place-items-center gap-2 rounded-s-full px-2 sm:px-4"
            onclick={handleFirst}
            disabled={duplicatesIndex === 0}
          >
            {$t('first')}
          </Button>
          <Button
            size="small"
            leadingIcon={mdiChevronLeft}
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
            trailingIcon={mdiChevronRight}
            color="primary"
            class="flex place-items-center gap-2 rounded-s-full px-2 sm:px-4"
            onclick={handleNext}
            disabled={duplicatesIndex === duplicates.length - 1}
          >
            {$t('next')}
          </Button>
          <Button
            size="small"
            trailingIcon={mdiPageLast}
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
