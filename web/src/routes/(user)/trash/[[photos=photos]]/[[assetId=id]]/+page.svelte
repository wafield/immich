<script lang="ts">
  import { goto } from '$app/navigation';
  import empty3Url from '$lib/assets/empty-3.svg';
  import UserPageLayout from '$lib/components/layouts/UserPageLayout.svelte';
  import EmptyPlaceholder from '$lib/components/shared-components/EmptyPlaceholder.svelte';
  import DeleteAssets from '$lib/components/timeline/actions/DeleteAssetsAction.svelte';
  import RestoreAssets from './RestoreAction.svelte';
  import SelectAllAssets from '$lib/components/timeline/actions/SelectAllAction.svelte';
  import AssetSelectControlBar from '$lib/components/timeline/AssetSelectControlBar.svelte';
  import Timeline from '$lib/components/timeline/Timeline.svelte';
  import { assetMultiSelectManager } from '$lib/managers/asset-multi-select-manager.svelte';
  import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
  import { serverConfigManager } from '$lib/managers/server-config-manager.svelte';
  import { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
  import { Route } from '$lib/route';
  import { getTrashActions } from '$lib/services/trash.service';
  import { selectedLibraries } from '$lib/stores/preferences.store';
  import { handlePromiseError } from '$lib/utils';
  import { handleError } from '$lib/utils/handle-error';
  import AssetAddToAlbumModal from '$lib/modals/AssetAddToAlbumModal.svelte';
  import { AssetOrderBy, restoreAssets } from '@immich/sdk';
  import { ActionButton, modalManager, toastManager, type ActionItem } from '@immich/ui';
  import { mdiPlus } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  type Props = {
    data: PageData;
  };

  let { data }: Props = $props();

  let timelineManager = $state<TimelineManager>() as TimelineManager;
  let options = $derived({ isTrashed: true, libraryIds: $selectedLibraries, orderBy: AssetOrderBy.DeletedAt });

  if (!featureFlagsManager.value.trash) {
    handlePromiseError(goto(Route.photos()));
  }

  const handleEscape = () => {
    if (!assetMultiSelectManager.selectionActive) {
      return;
    }

    assetMultiSelectManager.clear();
    return;
  };

  const handleAddToAlbum = () => {
    const ids = assetMultiSelectManager.assets.map((asset) => asset.id);
    void modalManager.show(AssetAddToAlbumModal, {
      assetIds: ids,
      beforeAdd: async () => {
        try {
          await restoreAssets({ bulkIdsDto: { ids } });
          timelineManager.removeAssets(ids);
          toastManager.primary($t('assets_restored_count', { values: { count: ids.length } }));
          assetMultiSelectManager.clear();
        } catch (error) {
          handleError(error, $t('errors.unable_to_restore_assets'));
          return false;
        }
      },
    });
  };

  const AddToAlbum: ActionItem = $derived({
    title: $t('add_to_album'),
    icon: mdiPlus,
    shortcuts: [{ key: 'l' }],
    onAction: handleAddToAlbum,
  });

  const { Empty, RestoreAll } = $derived(getTrashActions($t));
</script>

{#if featureFlagsManager.value.trash}
  <UserPageLayout
    actions={assetMultiSelectManager.selectionActive ? [] : [Empty, RestoreAll]}
    title={data.meta.title}
    scrollbar={false}
  >
    <Timeline
      enableRouting={true}
      bind:timelineManager
      {options}
      assetInteraction={assetMultiSelectManager}
      onEscape={handleEscape}
    >
      <p class="p-4 font-medium text-gray-500/60 dark:text-gray-300/60">
        {$t('trashed_items_will_be_permanently_deleted_after', {
          values: { days: serverConfigManager.value.trashDays },
        })}
      </p>
      {#snippet empty()}
        <EmptyPlaceholder text={$t('trash_no_results_message')} src={empty3Url} class="mx-auto mt-10" />
      {/snippet}
    </Timeline>
  </UserPageLayout>
{/if}

{#if assetMultiSelectManager.selectionActive}
  <AssetSelectControlBar>
    <SelectAllAssets {timelineManager} assetInteraction={assetMultiSelectManager} />
    <DeleteAssets force onAssetDelete={(assetIds) => timelineManager.removeAssets(assetIds)} />
    <RestoreAssets onRestore={(assetIds) => timelineManager.removeAssets(assetIds)} />
    <ActionButton action={AddToAlbum} />
  </AssetSelectControlBar>
{/if}
