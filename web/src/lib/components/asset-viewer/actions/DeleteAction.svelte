<script lang="ts">
  import { shortcuts } from '$lib/actions/shortcut';
  import { AssetAction } from '$lib/constants';
  import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
  import AssetDeleteConfirmModal from '$lib/modals/AssetDeleteConfirmModal.svelte';
  import AssetPredeletionConfirmModal from '$lib/modals/AssetPredeletionConfirmModal.svelte';
  import { deleteAssets as deleteAssetsUtil, type OnUndoDelete } from '$lib/utils/actions';
  import { handleError } from '$lib/utils/handle-error';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { deleteAssets, type AssetResponseDto } from '@immich/sdk';
  import { IconButton, modalManager, toastManager } from '@immich/ui';
  import { mdiDeleteForeverOutline, mdiDeleteOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import type { OnAction, PreAction } from './action';

  interface Props {
    asset: AssetResponseDto;
    onAction: OnAction;
    preAction: PreAction;
    onUndoDelete?: OnUndoDelete;
  }

  let { asset, onAction, preAction, onUndoDelete = undefined }: Props = $props();

  const forceDefault = $derived(asset.isTrashed || !featureFlagsManager.value.trash);

  const trashOrDelete = async (forceRequest?: boolean) => {
    const timelineAsset = toTimelineAsset(asset);

    // If the asset has any edits (has sidecar, has description) then pop up a confirmation dialog.
    if (timelineAsset.description || timelineAsset.hasSidecar || timelineAsset.isEdited) {
      const confirmed = await modalManager.show(AssetPredeletionConfirmModal, {});
      if (!confirmed) {
        return;
      }
    }

    // Whether to permanently delete the asset from storage.
    const force = forceDefault || forceRequest;

    if (force) {
      const confirmed = await modalManager.show(AssetDeleteConfirmModal, { size: 1 });
      if (!confirmed) {
        return;
      }

      try {
        preAction({ type: AssetAction.DELETE, asset: timelineAsset });
        await deleteAssets({ assetBulkDeleteDto: { ids: [asset.id], force: true } });
        onAction({ type: AssetAction.DELETE, asset: timelineAsset });
        toastManager.primary($t('permanently_deleted_asset'));
      } catch (error) {
        handleError(error, $t('errors.unable_to_delete_asset'));
      }

      return;
    }

    preAction({ type: AssetAction.TRASH, asset: timelineAsset });
    await deleteAssetsUtil(
      false,
      () => onAction({ type: AssetAction.TRASH, asset: timelineAsset }),
      [timelineAsset],
      onUndoDelete,
    );
  };
</script>

<svelte:document
  use:shortcuts={[
    { shortcut: { key: 'Delete' }, onShortcut: () => trashOrDelete() },
    { shortcut: { key: 'Delete', shift: true }, onShortcut: () => trashOrDelete(true) },
    { shortcut: { key: 'Backspace', meta: true }, onShortcut: () => trashOrDelete() },
    { shortcut: { key: 'Backspace', meta: true, alt: true }, onShortcut: () => trashOrDelete(true) },
  ]}
/>

<IconButton
  color="secondary"
  shape="round"
  variant="ghost"
  icon={forceDefault ? mdiDeleteForeverOutline : mdiDeleteOutline}
  aria-label={forceDefault ? $t('permanently_delete') : $t('delete')}
  onclick={() => trashOrDelete()}
/>
