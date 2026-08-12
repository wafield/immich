<script lang="ts">
  import FilterableSelectionList, {
    asSelectedOption,
    asSuggestionOptions,
  } from '$lib/components/shared-components/FilterableSelectionList.svelte';
  import type { SearchDateFilter, SearchLocationFilter } from '$lib/types';
  import { handlePromiseError } from '$lib/utils';
  import { asLocalTimeISO } from '$lib/utils/date-time';
  import { getSearchSuggestions, SearchSuggestionType, type SuggestionResponseDto } from '@immich/sdk';
  import { Text } from '@immich/ui';
  import type { DateTime } from 'luxon';
  import { t } from 'svelte-i18n';

  type Props = {
    filters: SearchLocationFilter;
    libraryId?: string;
    dateFilter?: SearchDateFilter;
  };

  let { filters = $bindable(), libraryId, dateFilter }: Props = $props();

  let countries: SuggestionResponseDto[] = $state([]);
  let states: SuggestionResponseDto[] = $state([]);
  let cities: SuggestionResponseDto[] = $state([]);

  const startTime = $derived(
    dateFilter?.takenAfter
      ? (asLocalTimeISO(dateFilter.takenAfter.startOf('day') as DateTime<true>) ?? undefined)
      : undefined,
  );
  const endTime = $derived(
    dateFilter?.takenBefore
      ? (asLocalTimeISO(dateFilter.takenBefore.endOf('day') as DateTime<true>) ?? undefined)
      : undefined,
  );

  async function updateCountries(libraryId?: string, startTime?: string, endTime?: string) {
    countries = await getSearchSuggestions({
      $type: SearchSuggestionType.Country,
      libraryId,
      startTime,
      endTime,
      includeNull: true,
    });

    if (filters.country && !countries.some((c) => (c.suggestion ?? '') === filters.country)) {
      filters.country = undefined;
    }
  }

  async function updateStates(country?: string, libraryId?: string, startTime?: string, endTime?: string) {
    states = await getSearchSuggestions({
      $type: SearchSuggestionType.State,
      country,
      libraryId,
      startTime,
      endTime,
      includeNull: true,
    });

    if (filters.state && !states.some((s) => (s.suggestion ?? '') === filters.state)) {
      filters.state = undefined;
    }
  }

  async function updateCities(
    country?: string,
    state?: string,
    libraryId?: string,
    startTime?: string,
    endTime?: string,
  ) {
    cities = await getSearchSuggestions({
      $type: SearchSuggestionType.City,
      country,
      state,
      libraryId,
      startTime,
      endTime,
    });

    if (filters.city && !cities.some((c) => (c.suggestion ?? '') === filters.city)) {
      filters.city = undefined;
    }
  }

  const countryFilter = $derived(filters.country);
  const stateFilter = $derived(filters.state);
  const currentLibraryId = $derived(libraryId);

  $effect(() => handlePromiseError(updateCountries(currentLibraryId, startTime, endTime)));
  $effect(() => handlePromiseError(updateStates(countryFilter, currentLibraryId, startTime, endTime)));
  $effect(() => handlePromiseError(updateCities(countryFilter, stateFilter, currentLibraryId, startTime, endTime)));
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
