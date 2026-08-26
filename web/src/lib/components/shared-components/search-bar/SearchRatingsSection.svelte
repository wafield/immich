<script lang="ts">
  import { searchManager } from '$lib/managers/search-manager.svelte';
  import { Text } from '@immich/ui';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { t } from 'svelte-i18n';
  import SearchButton from './SearchButton.svelte';

  let rating = $derived(searchManager.filter.rating);

  const options = [
    { value: 5, label: '★★★★★' },
    { value: 4, label: '★★★★' },
    { value: 3, label: '★★★' },
    { value: 2, label: '★★' },
    { value: 1, label: '★' },
  ];
</script>

{#if authManager.authenticated && authManager.preferences.ratings.enabled}
  <div class="flex flex-col gap-1">
    <Text fontWeight="medium">{$t('rating')}</Text>
    <Combobox
      label={$t('rating')}
      placeholder={$t('search_rating')}
      hideLabel
      {options}
      selectedOption={rating === undefined ? undefined : options[rating === null ? 0 : rating]}
      onSelect={(r) => (rating = r === undefined ? undefined : Number.parseInt(r.value))}
    />
  </div>
{/if}
