<script lang="ts">
  import Combobox, { type ComboBoxOption } from '$lib/components/shared-components/Combobox.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { getAllTags, type TagResponseDto } from '@immich/sdk';
  import { Checkbox, Label, Text } from '@immich/ui';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';
  import TagPill from '../TagPill.svelte';

  interface Props {
    selectedTags: SvelteSet<string> | null;
  }

  let { selectedTags = $bindable() }: Props = $props();

  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));
  let selectedOption = $state(undefined);

  onMount(async () => {
    allTags = await getAllTags();
  });

  const handleSelect = (option?: ComboBoxOption) => {
    if (!option || !option.id || selectedTags === null) {
      return;
    }

    selectedTags.add(option.value);
    selectedOption = undefined;
  };

  const handleRemove = (tag: string) => {
    if (selectedTags === null) {
      return;
    }

    // Move focus back to the container so it doesn't fallback to the body and closes the search bar
    container?.focus();
    selectedTags.delete(tag);
  };
</script>

{#if authManager.authenticated && authManager.preferences.tags.enabled}
  <div class="flex flex-col gap-1">
    <Text fontWeight="medium">{$t('tags')}</Text>
    <form autocomplete="off" id="create-tag-form" class="flex flex-col gap-1">
      <Combobox
        disabled={selectedTags === null}
        hideLabel
        onSelect={handleSelect}
        label={$t('tags')}
        defaultFirstOption
        options={allTags.map((tag) => ({ id: tag.id, label: tag.value, value: tag.id }))}
        bind:selectedOption
        placeholder={$t('search_tags')}
      />
      <div class="flex items-center gap-2">
        <Checkbox
          id="untagged-checkbox"
          size="tiny"
          checked={selectedTags === null}
          onCheckedChange={(checked) => {
            selectedTags = checked ? null : new SvelteSet();
          }}
        />
        <Label label={$t('untagged')} for="untagged-checkbox" class="text-sm font-normal" />
      </div>
    </form>

    <section class="flex flex-wrap gap-1 pt-2">
      {#each selectedTags ?? [] as tagId (tagId)}
        {@const tag = tagMap[tagId]}
        {#if tag}
          <TagPill label={tag.value} onRemove={() => handleRemove(tagId)} />
        {/if}
      {/each}
    </section>
  </div>
{/if}
