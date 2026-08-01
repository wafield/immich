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
  import {
    Button,
    Icon,
    ListButton,
    LoadingSpinner,
    Modal,
    ModalBody,
    ModalFooter,
    Text,
    toastManager,
  } from '@immich/ui';
  import { mdiFolderNetworkOutline, mdiHarddisk } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    assetIds: string[];
    onAssetChange?: OnMove;
    onClose: () => void;
  };

  let { assetIds, onAssetChange, onClose }: Props = $props();

  let libraries = $state<LibraryResponseDto[]>([]);
  let selectedLibraryId = $state<string | null>(null);
  let isMoving = $state(false);

  const loadLibraries = async () => {
    libraries = await getAllLibraries();
  };

  const handleMove = async () => {
    try {
      isMoving = true;
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
    } finally {
      isMoving = false;
    }
  };
</script>

<Modal title="Move to Library" {onClose} size="small">
  <ModalBody>
    {#await loadLibraries()}
      <div class="flex w-full place-content-center place-items-center py-6">
        <LoadingSpinner />
      </div>
    {:then _}
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

      <ModalFooter>
        <Button shape="round" color="secondary" onclick={onClose} disabled={isMoving}>
          {$t('cancel')}
        </Button>
        <Button shape="round" color="primary" onclick={handleMove} loading={isMoving}>
          {$t('move')}
        </Button>
      </ModalFooter>
    {/await}
  </ModalBody>
</Modal>
