<script lang="ts">
  import AlbumPickerModal from '$lib/modals/AlbumPickerModal.svelte';
  import { addAssetsToAlbumsMutation } from '$lib/queries/album.query';
  import { executeMutation } from '$lib/queries/client';
  import { type AlbumResponseDto } from '@immich/sdk';

  type Props = {
    assetIds: string[];
    onClose: () => void;
    beforeAdd?: () => Promise<boolean | void> | boolean | void;
  };

  const { assetIds, onClose, beforeAdd }: Props = $props();

  const handleClose = async (albums?: AlbumResponseDto[]) => {
    const albumIds = (albums ?? []).map(({ id }) => id);
    if (albumIds.length === 0) {
      onClose();
      return;
    }

    if (beforeAdd) {
      const ok = await beforeAdd();
      if (ok === false) {
        return;
      }
    }

    await executeMutation(addAssetsToAlbumsMutation, { albumIds, assetIds }, { onSuccess: onClose });
  };
</script>

<AlbumPickerModal selectedItemsCount={assetIds.length} onClose={handleClose} />
