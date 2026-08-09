<script lang="ts">
  import FilterableSelectionList, {
    asSelectedOption,
    asSuggestionOptions,
  } from '$lib/components/shared-components/FilterableSelectionList.svelte';
  import type { SearchLocationFilter } from '$lib/types';
  import { handlePromiseError } from '$lib/utils';
  import { getSearchSuggestions, SearchSuggestionType, type SuggestionResponseDto } from '@immich/sdk';
  import { Text } from '@immich/ui';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  type Props = {
    filters: SearchLocationFilter;
  };

  let { filters = $bindable() }: Props = $props();

  let countries: SuggestionResponseDto[] = $state([]);
  let states: SuggestionResponseDto[] = $state([]);
  let cities: SuggestionResponseDto[] = $state([]);

  async function updateCountries() {
    countries = await getSearchSuggestions({
      $type: SearchSuggestionType.Country,
      includeNull: true,
    });

    if (filters.country && !countries.some((c) => (c.suggestion ?? '') === filters.country)) {
      filters.country = undefined;
    }
  }

  async function updateStates(country?: string) {
    states = await getSearchSuggestions({
      $type: SearchSuggestionType.State,
      country,
      includeNull: true,
    });

    if (filters.state && !states.some((s) => (s.suggestion ?? '') === filters.state)) {
      filters.state = undefined;
    }
  }

  async function updateCities(country?: string, state?: string) {
    cities = await getSearchSuggestions({
      $type: SearchSuggestionType.City,
      country,
      state,
    });

    if (filters.city && !cities.some((c) => (c.suggestion ?? '') === filters.city)) {
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
      options={asSuggestionOptions(countries)}
      placeholder={$t('search_country')}
      selectedOption={asSelectedOption(filters.country)}
    />
  </div>

  <div class="w-full">
    <FilterableSelectionList
      label={$t('state')}
      onSelect={(option) => (filters.state = option?.value)}
      options={asSuggestionOptions(states)}
      placeholder={$t('search_state')}
      selectedOption={asSelectedOption(filters.state)}
    />
  </div>

  <div class="w-full">
    <FilterableSelectionList
      label={$t('city')}
      onSelect={(option) => (filters.city = option?.value)}
      options={asSuggestionOptions(cities)}
      placeholder={$t('search_city')}
      selectedOption={asSelectedOption(filters.city)}
    />
  </div>
</div>
