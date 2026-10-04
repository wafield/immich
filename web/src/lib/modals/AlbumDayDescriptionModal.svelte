<script lang="ts">
  import { Field, FormModal, Text, Textarea } from '@immich/ui';
  import { mdiNoteEditOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    date: string;
    dateTitle?: string;
    initialDescription?: string;
    onClose: (description?: string) => void;
  };

  let { date, dateTitle, initialDescription = '', onClose }: Props = $props();

  let description = $state(initialDescription);

  const onSubmit = () => {
    onClose(description.trim());
  };
</script>

<FormModal
  title={$t('edit_description')}
  icon={mdiNoteEditOutline}
  size="small"
  onClose={() => onClose(undefined)}
  {onSubmit}
>
  <div class="flex flex-col gap-3">
    {#if dateTitle}
      <Text color="secondary" size="small">
        {dateTitle}
      </Text>
    {/if}
    <Field label={$t('description')}>
      <Textarea bind:value={description} grow />
    </Field>
  </div>
</FormModal>
