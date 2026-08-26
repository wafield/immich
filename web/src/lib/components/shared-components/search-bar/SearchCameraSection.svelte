<script lang="ts">
  import FilterableSelectionList, {
    asSelectedOption,
    asSuggestionOptions,
  } from '$lib/components/shared-components/FilterableSelectionList.svelte';
  import { searchManager, SearchDateFilter } from '$lib/managers/search-manager.svelte';
  import { handlePromiseError } from '$lib/utils';
  import { asLocalTimeISO } from '$lib/utils/date-time';
  import { SearchSuggestionType, getSearchSuggestions, type SuggestionResponseDto } from '@immich/sdk';
  import { Text } from '@immich/ui';
  import type { DateTime } from 'luxon';
  import { t } from 'svelte-i18n';

  type Props = {
    filters: SearchCameraFilter;
    libraryId?: string;
    dateFilter?: SearchDateFilter;
  };

  let { filters = $bindable(), libraryId, dateFilter }: Props = $props();

  let makes: SuggestionResponseDto[] = $state([]);
  let models: SuggestionResponseDto[] = $state([]);
  let lensModels: SuggestionResponseDto[] = $state([]);

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

  async function updateMakes(libraryId?: string, startTime?: string, endTime?: string) {
    makes = await getSearchSuggestions({
      $type: SearchSuggestionType.CameraMake,
      libraryId,
      startTime,
      endTime,
      includeNull: true,
    });

    if (filters.make && !makes.some((m) => (m.suggestion ?? '') === filters.make)) {
      filters.make = undefined;
    }
  }

  async function updateModels(make?: string, libraryId?: string, startTime?: string, endTime?: string) {
    models = await getSearchSuggestions({
      $type: SearchSuggestionType.CameraModel,
      make,
      libraryId,
      startTime,
      endTime,
      includeNull: true,
    });

    if (filters.model && !models.some((m) => (m.suggestion ?? '') === filters.model)) {
      filters.model = undefined;
    }
  }

  async function updateLensModels(
    make?: string,
    model?: string,
    libraryId?: string,
    startTime?: string,
    endTime?: string,
  ) {
    lensModels = await getSearchSuggestions({
      $type: SearchSuggestionType.CameraLensModel,
      make,
      model,
      libraryId,
      startTime,
      endTime,
      includeNull: true,
    });

    if (filters.lensModel && !lensModels.some((lm) => (lm.suggestion ?? '') === filters.lensModel)) {
      filters.lensModel = undefined;
    }
  }

  const makeFilter = $derived(filters.make);
  const modelFilter = $derived(filters.model);
  const lensModelFilter = $derived(filters.lensModel);
  const currentLibraryId = $derived(libraryId);

  $effect(() => {
    handlePromiseError(updateMakes(currentLibraryId, startTime, endTime));
  });
  $effect(() => {
    handlePromiseError(updateModels(makeFilter, currentLibraryId, startTime, endTime));
  });
  $effect(() => {
    handlePromiseError(updateLensModels(makeFilter, modelFilter, currentLibraryId, startTime, endTime));
  });
</script>

<Text fontWeight="medium" class="pb-5">{$t('camera')}</Text>
<div class="grid grid-auto-fit-40 gap-2">
  <div class="w-full">
    <FilterableSelectionList
      label={$t('make')}
      onSelect={(option) => (filters.make = option?.value)}
      options={asSuggestionOptions(makes)}
      placeholder={$t('search_camera_make')}
      selectedOption={asSelectedOption(makeFilter)}
    />
  </div>

  <div class="w-full">
    <FilterableSelectionList
      label={$t('model')}
      onSelect={(option) => (filters.model = option?.value)}
      options={asSuggestionOptions(models)}
      placeholder={$t('search_camera_model')}
      selectedOption={asSelectedOption(modelFilter)}
    />
  </div>

  <div class="w-full">
    <FilterableSelectionList
      label={$t('lens_model')}
      onSelect={(option) => (filters.lensModel = option?.value)}
      options={asSuggestionOptions(lensModels)}
      placeholder={$t('search_camera_lens_model')}
      selectedOption={asSelectedOption(lensModelFilter)}
    />
  </div>
</div>
