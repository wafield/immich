<script lang="ts">
  import { Button, Text } from '@immich/ui';

  type Props = {
    label?: string;
    value?: boolean | null;
    disabled?: boolean;
  };

  let { label, value = $bindable(), disabled = false }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <Text class="text-sm font-normal text-neutral-600 dark:text-neutral-300">{label}</Text>
  {/if}
  <div class="flex text-xs text-black">
    <Button
      class="rounded-s-full"
      size="small"
      {disabled}
      color={value === true ? 'primary' : 'secondary'}
      onclick={() => (value = true)}
    >
      Only
    </Button>
    <Button
      class="rounded-none"
      size="small"
      {disabled}
      color={value === false ? 'primary' : 'secondary'}
      onclick={() => (value = false)}
    >
      Exclude
    </Button>
    <Button
      class="rounded-e-full"
      size="small"
      {disabled}
      color={value === null || value === undefined ? 'primary' : 'secondary'}
      onclick={() => (value = undefined)}
    >
      Unset
    </Button>
  </div>
</div>
