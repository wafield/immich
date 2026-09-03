<script lang="ts">
  import FormatMessage from '$lib/elements/FormatMessage.svelte';
  import { showDeleteModal } from '$lib/stores/preferences.store';
  import { ConfirmModal } from '@immich/ui';
  import { mdiDeleteForeverOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    size: number;
    onClose: (confirmed?: boolean) => void;
  };

  let { size, onClose: onCloseParent }: Props = $props();

  let checked = $state(false);

  const onClose = (confirmed: boolean) => {
    if (confirmed && checked) {
      $showDeleteModal = false;
    }

    onCloseParent(confirmed);
  };
</script>

<ConfirmModal
  title={$t('permanently_delete_assets_count', { values: { count: size } })}
  confirmText={$t('delete')}
  icon={mdiDeleteForeverOutline}
  {onClose}
>
  {#snippet prompt()}
    <p>
      <FormatMessage key="permanently_delete_assets_prompt" values={{ count: size }}>
        {#snippet children({ message })}
          <b>{message}</b>
        {/snippet}
      </FormatMessage>
    </p>
    <p><b>{$t('cannot_undo_this_action')}</b></p>
  {/snippet}
</ConfirmModal>
