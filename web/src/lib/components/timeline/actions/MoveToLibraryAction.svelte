<script lang="ts">
  import MenuOption from '$lib/components/shared-components/context-menu/MenuOption.svelte';
  import { assetMultiSelectManager } from '$lib/managers/asset-multi-select-manager.svelte';
  import AssetMoveLibraryModal from '$lib/modals/AssetMoveLibraryModal.svelte';
  import type { OnMove } from '$lib/utils/actions';
  import { IconButton, modalManager } from '@immich/ui';
  import { mdiDatabaseArrowRight } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    onAssetChange?: OnMove;
    menuItem?: boolean;
  };

  let { onAssetChange, menuItem = false }: Props = $props();

  const handleMoveToLibrary = () => {
    const assetIds = assetMultiSelectManager.assets.map(({ id }) => id);
    modalManager.open(AssetMoveLibraryModal, { assetIds, onAssetChange });
  };
</script>

{#if menuItem}
  <MenuOption text="Move to Library" icon={mdiDatabaseArrowRight} onClick={handleMoveToLibrary} />
{:else}
  <IconButton
    shape="round"
    color="secondary"
    variant="ghost"
    aria-label="Move to Library"
    title="Move to Library"
    icon={mdiDatabaseArrowRight}
    onclick={handleMoveToLibrary}
  />
{/if}
