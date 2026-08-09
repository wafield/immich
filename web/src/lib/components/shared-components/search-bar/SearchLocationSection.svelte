<script lang="ts">
  import FilterableSelectionList, {
    asOptions,
    asSelectedOption,
  } from '$lib/components/shared-components/FilterableSelectionList.svelte';
  import type { SearchLocationFilter } from '$lib/types';
  import { handlePromiseError } from '$lib/utils';
  import { getSearchSuggestions, SearchSuggestionType } from '@immich/sdk';
  import { Text } from '@immich/ui';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  type Props = {
    filters: SearchLocationFilter;
  };

  let { filters = $bindable() }: Props = $props();

  let countries: string[] = $state([]);
  let states: string[] = $state([]);
  let cities: string[] = $state([]);

  async function updateCountries() {
    const results: Array<string | null> = await getSearchSuggestions({
      $type: SearchSuggestionType.Country,
      includeNull: true,
    });

    countries = results.map((result) => result ?? '');

    if (filters.country && !countries.includes(filters.country)) {
      filters.country = undefined;
    }
  }

  async function updateStates(country?: string) {
    const results: Array<string | null> = await getSearchSuggestions({
      $type: SearchSuggestionType.State,
      country,
      includeNull: true,
    });

    states = results.map((result) => result ?? '');

    if (filters.state && !states.includes(filters.state)) {
      filters.state = undefined;
    }
  }

  async function updateCities(country?: string, state?: string) {
    const results: Array<string | null> = await getSearchSuggestions({
      $type: SearchSuggestionType.City,
      country,
      state,
    });

    cities = results.map((result) => result ?? '');

    if (filters.city && !cities.includes(filters.city)) {
      filters.city = undefined;
    }
  }
  let countryFilter = $derived(filters.country);
  let stateFilter = $derived(filters.state);

  $effect(() => handlePromiseError(updateStates(countryFilter)));
  $effect(() => handlePromiseError(updateCities(countryFilter, stateFilter)));

  onMount(() => updateCountries());
</script>

<Text fontWeight="medium">{$t('place')}</Text>

<div class="mt-1 grid grid-auto-fit-40 gap-5">
  <div class="w-full">
    <FilterableSelectionList
      label={$t('country')}
      onSelect={(option) => (filters.country = option?.value)}
      options={asOptions(countries)}
      placeholder={$t('search_country')}
      selectedOption={asSelectedOption(filters.country)}
    />
  </div>

  <div class="w-full">
    <FilterableSelectionList
      label={$t('state')}
      onSelect={(option) => (filters.state = option?.value)}
      options={asOptions(states)}
      placeholder={$t('search_state')}
      selectedOption={asSelectedOption(filters.state)}
    />
  </div>

  <div class="w-full">
    <FilterableSelectionList
      label={$t('city')}
      onSelect={(option) => (filters.city = option?.value)}
      options={asOptions(cities)}
      placeholder={$t('search_city')}
      selectedOption={asSelectedOption(filters.city)}
    />
  </div>
</div>
