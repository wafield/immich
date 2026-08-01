<script lang="ts">
  import { assetMultiSelectManager } from '$lib/managers/asset-multi-select-manager.svelte';
  import type { OnMove } from '$lib/utils/actions';
  import { handleError } from '$lib/utils/handle-error';
  import {
    getAllLibraries,
    getAssetInfo,
    moveAssetsToLibrary,
    type AssetMoveResponseDto,
    type LibraryResponseDto,
  } from '@immich/sdk';
  import { FormModal, Icon, ListButton, LoadingSpinner, Text, toastManager } from '@immich/ui';
  import { mdiDatabaseArrowRight, mdiFolderNetworkOutline, mdiHarddisk } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  type Props = {
    assetIds: string[];
    onAssetChange?: OnMove;
    onClose: () => void;
  };

  let { assetIds, onAssetChange, onClose }: Props = $props();

  let libraries = $state<LibraryResponseDto[]>([]);
  let loading = $state(true);

  const selectedAssets = $derived(assetMultiSelectManager.assets.filter((a) => assetIds.includes(a.id)));
  const sourceLibraryIds = $derived(new Set(selectedAssets.map((a) => a.libraryId ?? null)));
  const initialLibraryId = $derived(sourceLibraryIds.size === 1 ? [...sourceLibraryIds][0] : undefined);

  let selectedLibraryId = $state<string | null | undefined>(initialLibraryId);

  const disabled = $derived(
    selectedLibraryId === undefined ||
      (selectedAssets.length > 0 && selectedAssets.every((a) => (a.libraryId ?? null) === selectedLibraryId)),
  );

  onMount(async () => {
    libraries = await getAllLibraries();
    libraries.sort((a, b) => a.name.localeCompare(b.name));
    loading = false;
  });

  const handleMove = async () => {
    if (selectedLibraryId === undefined) {
      return;
    }

    try {
      const results: AssetMoveResponseDto[] = await moveAssetsToLibrary({
        moveAssetLibraryDto: {
          assetIds,
          targetLibraryId: selectedLibraryId,
        },
      });

      const successResults = results.filter((r) => r.success);
      const failedResults = results.filter((r) => !r.success);

      if (successResults.length > 0) {
        const successIds = successResults.map((r) => r.id);

        const fetchedAssets = await Promise.all(successIds.map((id) => getAssetInfo({ id }).catch(() => null)));

        // A list of successfully moved assets that will be updated on the UI (e.g. update library indicator).
        const assetsToUpsert = fetchedAssets.filter((a): a is NonNullable<typeof a> => a !== null);

        if (assetsToUpsert.length > 0) {
          onAssetChange?.(assetsToUpsert, selectedLibraryId);
        }
      }

      // Display detailed toast for results
      const targetLibName = selectedLibraryId
        ? libraries.find((l) => l.id === selectedLibraryId)?.name || 'Target Library'
        : 'Default Library';

      if (failedResults.length === 0) {
        toastManager.primary(
          `Moved ${successResults.length} asset${successResults.length === 1 ? '' : 's'} to ${targetLibName}`,
        );
      } else if (successResults.length === 0) {
        const firstError = failedResults[0]?.error || 'Failed to move assets';
        toastManager.danger(
          `Failed to move ${failedResults.length} asset${failedResults.length === 1 ? '' : 's'} to ${targetLibName}: ${firstError}`,
        );
      } else {
        const errorDetails = failedResults.map((f) => `- ${f.id}: ${f.error}`).join('\n');
        toastManager.warning(
          `Moved ${successResults.length} asset${successResults.length === 1 ? '' : 's'} to ${targetLibName}.\n${failedResults.length} failed:\n${errorDetails}`,
        );
      }

      assetMultiSelectManager.clear();
      onClose();
    } catch (error) {
      handleError(error, 'Unable to move assets to selected library');
    }
  };
</script>

<FormModal
  title="Move to Library"
  icon={mdiDatabaseArrowRight}
  size="small"
  {onClose}
  onSubmit={handleMove}
  submitText={$t('move')}
  {disabled}
>
  {#if loading}
    <div class="flex w-full place-content-center place-items-center py-6">
      <LoadingSpinner />
    </div>
  {:else}
    <div class="flex max-h-80 immich-scrollbar flex-col gap-2 overflow-y-auto p-1">
      <!-- Default Library Option -->
      <ListButton onclick={() => (selectedLibraryId = null)} selected={selectedLibraryId === null}>
        <Icon icon={mdiHarddisk} size="24" class="text-primary" />
        <div class="grow text-start">
          <Text fontWeight="medium">Default Library</Text>
          <Text size="tiny" color="muted">Default internal upload library</Text>
        </div>
      </ListButton>

      <!-- All External / Custom Database Libraries -->
      {#each libraries as library (library.id)}
        <ListButton onclick={() => (selectedLibraryId = library.id)} selected={selectedLibraryId === library.id}>
          <Icon icon={mdiFolderNetworkOutline} size="24" class="text-primary" />
          <div class="grow text-start">
            <Text fontWeight="medium">{library.name}</Text>
            {#if library.importPaths?.[0]}
              <Text size="tiny" color="muted">{library.importPaths[0]}</Text>
            {/if}
          </div>
        </ListButton>
      {/each}
    </div>
  {/if}
</FormModal>
