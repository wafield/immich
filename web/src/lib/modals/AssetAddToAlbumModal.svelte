<script lang="ts">
  import AlbumPickerModal from '$lib/modals/AlbumPickerModal.svelte';
  import { addAssetsToAlbums } from '$lib/services/album.service';
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

    const success = await addAssetsToAlbums(albumIds, assetIds, { notify: true });
    if (success) {
      onClose();
    }
  };
</script>

<AlbumPickerModal selectedItemsCount={assetIds.length} onClose={handleClose} />
