<script lang="ts">
  import TriStateFilter from '$lib/components/shared-components/TriStateFilter.svelte';
  import type { SearchDisplayFilters } from '$lib/types';
  import { Text } from '@immich/ui';
  import { t } from 'svelte-i18n';

  type Props = {
    filters: SearchDisplayFilters;
  };

  let { filters = $bindable() }: Props = $props();
</script>

<div id="display-options-selection">
  <fieldset>
    <Text class="mb-2" fontWeight="medium">{$t('display_options')}</Text>

    <div class="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TriStateFilter label={$t('not_in_any_album')} bind:value={filters.isNotInAlbum} />
      <TriStateFilter label="Show Archived" bind:value={filters.isArchive} />
      <TriStateFilter label="Show Favorites" bind:value={filters.isFavorite} />
      <TriStateFilter label="Show Offline" bind:value={filters.isOffline} />
      <TriStateFilter label="Show Live Photo" bind:value={filters.isMotion} />
      <TriStateFilter label="Show Screenshot" bind:value={filters.isScreenshot} />
      <TriStateFilter label="Show Stacked" bind:value={filters.isStacked} />
      <TriStateFilter label="Show Trashed" bind:value={filters.isTrashed} />
    </div>
  </fieldset>
</div>
