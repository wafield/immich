<script lang="ts">
  import type { SearchDisplayFilters } from '$lib/types';
  import { Checkbox, Label, Text } from '@immich/ui';
  import { t } from 'svelte-i18n';

  type Props = {
    filters: SearchDisplayFilters;
  };

  let { filters = $bindable() }: Props = $props();
</script>

<div id="display-options-selection">
  <fieldset>
    <Text class="mb-2" fontWeight="medium">{$t('display_options')}</Text>

    <div class="mt-1 flex flex-wrap gap-x-5 gap-y-2">
      <div class="flex items-center gap-2">
        <Checkbox id="not-in-album-checkbox" size="tiny" bind:checked={filters.isNotInAlbum} />
        <Label label={$t('not_in_any_album')} for="not-in-album-checkbox" class="text-sm font-normal" />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox id="archive-checkbox" size="tiny" bind:checked={filters.isArchive} />
        <Label label={$t('archive')} for="archive-checkbox" class="text-sm font-normal" />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox id="favorites-checkbox" size="tiny" bind:checked={filters.isFavorite} />
        <Label label={$t('favorites')} for="favorites-checkbox" class="text-sm font-normal" />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox id="offline-checkbox" size="tiny" bind:checked={filters.isOffline} />
        <Label label="Include offline" for="offline-checkbox" class="text-sm font-normal" />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox id="motion-checkbox" size="tiny" bind:checked={filters.isMotion} />
        <Label label="Include live photo" for="motion-checkbox" class="text-sm font-normal" />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox id="with-deleted-checkbox" size="tiny" bind:checked={filters.withDeleted} />
        <Label label="Include trashed" for="with-deleted-checkbox" class="text-sm font-normal" />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox id="with-stacked-checkbox" size="tiny" bind:checked={filters.withStacked} />
        <Label label="Include stacked" for="with-stacked-checkbox" class="text-sm font-normal" />
      </div>
    </div>
  </fieldset>
</div>
