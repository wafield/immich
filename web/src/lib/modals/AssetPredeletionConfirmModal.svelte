<script lang="ts">
  import { ConfirmModal } from '@immich/ui';
  import { mdiDeleteOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    onClose: (confirmed?: boolean) => void;
  };

  let { onClose: onCloseParent }: Props = $props();

  const onClose = (confirmed: boolean) => onCloseParent(confirmed);
</script>

<ConfirmModal title="Deleting item(s)" confirmText={$t('delete')} icon={mdiDeleteOutline} {onClose}>
  {#snippet prompt()}
    <p>One or more items you are trying to delete are manually edited, has description, or has sidecar XMP file.</p>
    <p><b>Continue to delete?</b></p>
  {/snippet}
</ConfirmModal>
