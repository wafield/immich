<script lang="ts">
  import FilterableSelectionList, {
    asSelectedOption,
    asSuggestionOptions,
    type FilterableSelectionListOptions,
  } from '$lib/components/shared-components/FilterableSelectionList.svelte';
  import type { SearchDateFilter } from '$lib/types';
  import { handlePromiseError } from '$lib/utils';
  import { getSearchSuggestions, SearchSuggestionType, type SuggestionResponseDto } from '@immich/sdk';
  import { DatePicker, Text } from '@immich/ui';
  import { DateTime } from 'luxon';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  type Props = {
    filters: SearchDateFilter;
  };

  let { filters = $bindable() }: Props = $props();

  let presetTimeRanges: SuggestionResponseDto[] = $state([]);

  async function loadAllPresetTimeRanges() {
    presetTimeRanges = await getSearchSuggestions({
      $type: SearchSuggestionType.PresetTimeRange,
    });
  }

  const handlePresetTimeRangeSelect = (option: FilterableSelectionListOptions | undefined) => {
    if (option?.value) {
      const match = presetTimeRanges.find((item) => (item.suggestion ?? '') === option.value);
      if (match && match.startTime && match.endTime) {
        filters.takenAfter = DateTime.fromISO(match.startTime);
        filters.takenBefore = DateTime.fromISO(match.endTime);
        return;
      }
    }
    filters.takenAfter = undefined;
    filters.takenBefore = undefined;
  };

  let selectedPresetTimeRangeOption = $derived.by(() => {
    if (!filters.takenAfter || !filters.takenBefore) {
      return undefined;
    }
    const match = presetTimeRanges.find((item) => {
      if (!item.startTime || !item.endTime) return false;
      const itemStart = DateTime.fromISO(item.startTime);
      const itemEnd = DateTime.fromISO(item.endTime);
      return (
        Math.abs(filters.takenAfter!.toMillis() - itemStart.toMillis()) < 1000 &&
        Math.abs(filters.takenBefore!.toMillis() - itemEnd.toMillis()) < 1000
      );
    });
    return match ? asSelectedOption(match.suggestion ?? '') : undefined;
  });

  let invalid = $derived(filters.takenAfter && filters.takenBefore && filters.takenAfter > filters.takenBefore);

  onMount(() => {
    handlePromiseError(loadAllPresetTimeRanges());
  });
</script>

<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
  <div class="w-full">
    <Text fontWeight="medium">Time Range</Text>
    <FilterableSelectionList
      label={'Time Range Select'}
      hideLabel={true}
      onSelect={handlePresetTimeRangeSelect}
      options={asSuggestionOptions(presetTimeRanges.map((item) => ({ ...item, startTime: null, endTime: null })))}
      placeholder={'Time Range Select'}
      selectedOption={selectedPresetTimeRangeOption}
    />
  </div>

  <div class="flex flex-col gap-4">
    <div>
      <Text class="mb-2" fontWeight="medium">{$t('start_date')}</Text>
      <DatePicker bind:value={filters.takenAfter} />
    </div>

    <div>
      <Text class="mb-2" fontWeight="medium">{$t('end_date')}</Text>
      <DatePicker bind:value={filters.takenBefore} />
    </div>
  </div>
</div>
{#if invalid}
  <Text color="danger">{$t('start_date_before_end_date')}</Text>
{/if}
