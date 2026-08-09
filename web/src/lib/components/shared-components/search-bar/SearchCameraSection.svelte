<script lang="ts">
  import FilterableSelectionList, {
    asSelectedOption,
    asSuggestionOptions,
  } from '$lib/components/shared-components/FilterableSelectionList.svelte';
  import type { SearchCameraFilter } from '$lib/types';
  import { handlePromiseError } from '$lib/utils';
  import { SearchSuggestionType, getSearchSuggestions, type SuggestionResponseDto } from '@immich/sdk';
  import { Text } from '@immich/ui';
  import { t } from 'svelte-i18n';

  type Props = {
    filters: SearchCameraFilter;
  };

  let { filters = $bindable() }: Props = $props();

  let makes: SuggestionResponseDto[] = $state([]);
  let models: SuggestionResponseDto[] = $state([]);
  let lensModels: SuggestionResponseDto[] = $state([]);

  async function updateMakes() {
    makes = await getSearchSuggestions({
      $type: SearchSuggestionType.CameraMake,
      includeNull: true,
    });

    if (filters.make && !makes.some((m) => (m.suggestion ?? '') === filters.make)) {
      filters.make = undefined;
    }
  }

  async function updateModels(make?: string) {
    models = await getSearchSuggestions({
      $type: SearchSuggestionType.CameraModel,
      make,
      includeNull: true,
    });

    if (filters.model && !models.some((m) => (m.suggestion ?? '') === filters.model)) {
      filters.model = undefined;
    }
  }

  async function updateLensModels(make?: string, model?: string) {
    lensModels = await getSearchSuggestions({
      $type: SearchSuggestionType.CameraLensModel,
      make,
      model,
      includeNull: true,
    });

    if (filters.lensModel && !lensModels.some((lm) => (lm.suggestion ?? '') === filters.lensModel)) {
      filters.lensModel = undefined;
    }
  }

  const makeFilter = $derived(filters.make);
  const modelFilter = $derived(filters.model);
  const lensModelFilter = $derived(filters.lensModel);

  // TODO replace by async $derived, at the latest when it's in stable https://svelte.dev/docs/svelte/await-expressions
  $effect(() => {
    handlePromiseError(updateMakes());
  });
  $effect(() => {
    handlePromiseError(updateModels(makeFilter));
  });
  $effect(() => {
    handlePromiseError(updateLensModels(makeFilter, modelFilter));
  });
</script>

<Text fontWeight="medium">{$t('camera')}</Text>
<div class="mt-1 grid grid-auto-fit-40 gap-5">
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
