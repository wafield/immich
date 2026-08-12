<script lang="ts">
  import Dropdown, { type RenderedOption } from '$lib/elements/Dropdown.svelte';
  import { userLibraries } from '$lib/stores/library.store';
  import { getSearchSuggestions, SearchSuggestionType, type SuggestionResponseDto } from '@immich/sdk';
  import { Text } from '@immich/ui';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  type Props = {
    libraryId?: string;
  };

  let { libraryId = $bindable() }: Props = $props();

  let librarySuggestions: SuggestionResponseDto[] = $state([]);

  async function loadLibrarySuggestions() {
    try {
      librarySuggestions = await getSearchSuggestions({
        $type: SearchSuggestionType.Library,
      });
    } catch (error) {
      console.error('Failed to load library search suggestions:', error);
      librarySuggestions = [];
    }
  }

  onMount(() => {
    void loadLibrarySuggestions();
  });

  type LibraryOption = {
    id?: string;
    suggestion: string;
    assetCount?: number;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
  };

  const allLibrariesLabel = 'All Libraries';

  const defaultOption = $derived<LibraryOption>({
    id: undefined,
    suggestion: allLibrariesLabel,
  });

  const options = $derived<LibraryOption[]>([
    defaultOption,
    ...librarySuggestions.map((item) => {
      const name = item.suggestion ?? '(Unknown)';
      const matchingLib = $userLibraries.find((lib) => lib.name === name);
      return {
        id: matchingLib?.id,
        suggestion: name,
        assetCount: item.assetCount,
        startTime: item.startTime,
        endTime: item.endTime,
      };
    }),
  ]);

  let selectedOption = $derived.by(() => {
    if (!libraryId) {
      return defaultOption;
    }
    return options.find((opt) => opt.id === libraryId) ?? defaultOption;
  });

  const formatOption = (option: LibraryOption): RenderedOption => {
    if (!option.id) {
      return { title: option.suggestion };
    }

    const name = option.suggestion;
    const count =
      option.assetCount !== undefined && option.assetCount !== null ? option.assetCount.toLocaleString() : null;

    let yearRange: string | null = null;
    if (option.startTime && option.endTime) {
      const startYear = new Date(option.startTime).getUTCFullYear();
      const endYear = new Date(option.endTime).getUTCFullYear();
      if (!isNaN(startYear) && !isNaN(endYear)) {
        yearRange = startYear === endYear ? `${startYear}` : `${startYear} - ${endYear}`;
      }
    }

    const details = [count !== null ? `${count} assets` : null, yearRange].filter(Boolean).join(' • ');
    const title = details ? `${name} (${details})` : name;

    return { title };
  };
</script>

<div class="flex flex-col gap-1">
  <Text fontWeight="medium">{$t('library', { default: 'Library' })}</Text>
  <Dropdown
    {options}
    {selectedOption}
    onSelect={(opt) => (libraryId = opt.id)}
    render={formatOption}
    hideTextOnSmallScreen={false}
  />
</div>
