<script lang="ts" module>
  import type { SuggestionResponseDto } from '@immich/sdk';

  // Data structure for a single option in the component.
  export type FilterableSelectionListOptions = {
    id?: string;
    /* User-visible text */
    label: string;
    /* Value to be returned when selected */
    value: string;
    assetCount?: number;
    sublabel?: string;
  };

  export const asOptions = (values: string[]) =>
    values.map((value) => {
      if (value === '') {
        return { label: '(Unknown)', value: '' };
      }

      return { label: value, value };
    });

  export const asSuggestionOptions = (items: SuggestionResponseDto[]): FilterableSelectionListOptions[] =>
    items.map((item) => {
      const value = item.suggestion ?? '';
      const label = value === '' ? '(Unknown)' : value;

      if (value === '' || item.assetCount === undefined || item.assetCount === null) {
        return { label, value };
      }

      const startYear = item.startTime ? new Date(item.startTime).getUTCFullYear() : undefined;
      const endYear = item.endTime ? new Date(item.endTime).getUTCFullYear() : undefined;

      let sublabel: string | undefined;
      if (startYear !== undefined && endYear !== undefined && !isNaN(startYear) && !isNaN(endYear)) {
        sublabel = startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
      }

      return {
        label,
        value,
        assetCount: item.assetCount,
        sublabel,
      };
    });

  export const asFilterableSelectionListOptions = asOptions;

  export const asSelectedOption = (value?: string) => (value === undefined ? undefined : asOptions([value])[0]);

  export const asSelectedOptions = (values: string[]) => asOptions(values);
</script>

<script lang="ts">
  import { shortcuts } from '$lib/actions/shortcut';
  import { generateId } from '$lib/utils/generate-id';
  import { Badge, Checkbox, Icon, IconButton, Label } from '@immich/ui';
  import { mdiCheck, mdiClose, mdiMagnify } from '@mdi/js';
  import { tick } from 'svelte';
  import { t } from 'svelte-i18n';
  import type { FormEventHandler } from 'svelte/elements';

  interface Props {
    label: string;
    disabled?: boolean;
    hideLabel?: boolean;
    options?: FilterableSelectionListOptions[];
    multiselect?: boolean;
    selectedOption?: FilterableSelectionListOptions | undefined;
    selectedOptions?: FilterableSelectionListOptions[];
    placeholder?: string;
    defaultFirstOption?: boolean;
    onSelect?: (option: FilterableSelectionListOptions | undefined) => void;
    onSelectMulti?: (options: FilterableSelectionListOptions[]) => void;
    forceFocus?: boolean;
    heightClass?: string;
  }

  let {
    label,
    hideLabel = false,
    disabled = false,
    options = [],
    multiselect = false,
    selectedOption = $bindable(),
    selectedOptions = $bindable([]),
    placeholder = '',
    defaultFirstOption = false,
    onSelect = () => {},
    onSelectMulti = () => {},
    forceFocus = false,
    heightClass = 'h-60',
  }: Props = $props();

  const id: string = generateId();
  let searchQuery = $state('');
  let selectedIndex: number | undefined = $state();
  let optionRefs: HTMLElement[] = $state([]);
  let input = $state<HTMLInputElement>();

  const inputId = `filterable-list-input-${id}`;
  const listboxId = `filterable-listbox-${id}`;

  const forceFocusInput = (el: HTMLInputElement) => {
    if (forceFocus) {
      el.focus();
    }
  };

  let filteredOptions = $derived.by(() => {
    const query = searchQuery.trim().toLowerCase();
    return query === '' ? options : options.filter((option) => option.label.toLowerCase().includes(query));
  });

  const isOptionSelected = (option: FilterableSelectionListOptions): boolean => {
    if (multiselect) {
      return (selectedOptions ?? []).some((item) =>
        item.id && option.id ? item.id === option.id : item.value === option.value,
      );
    }
    if (!selectedOption) return false;
    return selectedOption.id && option.id ? selectedOption.id === option.id : selectedOption.value === option.value;
  };

  const handleSelect = (option: FilterableSelectionListOptions) => {
    if (disabled) return;

    if (multiselect) {
      const alreadySelected = isOptionSelected(option);
      if (alreadySelected) {
        selectedOptions = (selectedOptions ?? []).filter((item) =>
          item.id && option.id ? item.id !== option.id : item.value !== option.value,
        );
      } else {
        selectedOptions = [...(selectedOptions ?? []), option];
      }
      onSelectMulti(selectedOptions);
      onSelect(option);
    } else {
      if (isOptionSelected(option)) {
        selectedOption = undefined;
      } else {
        selectedOption = option;
      }
      onSelect(selectedOption);
    }
  };

  const onClearSearch = () => {
    searchQuery = '';
    input?.focus();
  };

  const incrementSelectedIndex = async (increment: number) => {
    if (filteredOptions.length === 0) {
      selectedIndex = 0;
    } else if (selectedIndex === undefined) {
      selectedIndex = increment === 1 ? 0 : filteredOptions.length - 1;
    } else {
      selectedIndex = (selectedIndex + increment + filteredOptions.length) % filteredOptions.length;
    }
    await tick();
    optionRefs[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  };

  const onInput: FormEventHandler<HTMLInputElement> = (event) => {
    searchQuery = event.currentTarget.value;
    selectedIndex = defaultFirstOption ? 0 : undefined;
    if (selectedIndex !== undefined) {
      optionRefs[0]?.scrollIntoView({ block: 'nearest' });
    }
  };
</script>

<Label class="mb-1 block {hideLabel ? 'sr-only' : ''} text-xs font-light text-neutral-500" for={inputId}>
  {label}
</Label>
<div class="relative flex w-full flex-col text-base text-gray-700 dark:text-gray-300">
  <div class="relative w-full">
    <div
      class="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center ps-3 text-gray-400 dark:text-immich-dark-fg/75"
    >
      <Icon icon={mdiMagnify} aria-hidden />
    </div>

    <input
      {placeholder}
      {disabled}
      aria-activedescendant={selectedIndex !== undefined && selectedIndex >= 0 ? `${listboxId}-${selectedIndex}` : ''}
      aria-autocomplete="list"
      aria-controls={listboxId}
      autocomplete="off"
      bind:this={input}
      class="immich-form-input w-full rounded-b-none border-b-0 ps-9 pe-10 text-sm transition-all"
      id={inputId}
      oninput={onInput}
      role="searchbox"
      type="text"
      bind:value={searchQuery}
      use:forceFocusInput
      use:shortcuts={[
        {
          shortcut: { key: 'ArrowUp' },
          onShortcut: () => {
            void incrementSelectedIndex(-1);
          },
        },
        {
          shortcut: { key: 'ArrowDown' },
          onShortcut: () => {
            void incrementSelectedIndex(1);
          },
        },
        {
          shortcut: { key: 'Enter' },
          onShortcut: (event) => {
            event.preventDefault();
            if (selectedIndex !== undefined && filteredOptions[selectedIndex]) {
              handleSelect(filteredOptions[selectedIndex]);
            }
          },
        },
        {
          shortcut: { key: 'Escape' },
          onShortcut: (event) => {
            event.stopPropagation();
            searchQuery = '';
          },
        },
      ]}
    />

    {#if searchQuery}
      <div class="absolute inset-e-0 top-0 flex h-full items-center px-2">
        <IconButton
          shape="round"
          color="secondary"
          variant="ghost"
          onclick={onClearSearch}
          aria-label={$t('clear_value')}
          icon={mdiClose}
          size="small"
        />
      </div>
    {/if}
  </div>

  <ul
    role="listbox"
    id={listboxId}
    class="w-full overflow-y-auto immich-scrollbar rounded-b-xl border border-gray-300 bg-white text-start text-sm dark:border-gray-900 dark:bg-gray-800 {heightClass}"
    tabindex="-1"
  >
    {#if filteredOptions.length === 0}
      <li
        role="option"
        aria-selected={false}
        aria-disabled={true}
        class="w-full cursor-default px-4 py-2.5 text-center text-sm text-gray-500 dark:text-gray-400"
        id={`${listboxId}-empty`}
      >
        {$t('no_results')}
      </li>
    {:else}
      {#each filteredOptions as option, index (option.id || option.value || option.label)}
        {@const selected = isOptionSelected(option)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          aria-selected={selected || index === selectedIndex}
          bind:this={optionRefs[index]}
          class="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2 text-start transition-all hover:bg-gray-200 dark:hover:bg-gray-700
            {selected ? 'bg-gray-100 font-medium text-primary dark:bg-gray-700/60 dark:text-primary-light' : ''}
            {index === selectedIndex && !selected ? 'bg-gray-100 dark:bg-gray-700/40' : ''}"
          id={`${listboxId}-${index}`}
          onclick={() => handleSelect(option)}
          role="option"
        >
          <div class="flex items-center gap-2 min-w-0">
            {#if multiselect}
              <Checkbox checked={selected} size="small" />
            {/if}
            <div class="flex flex-col">
              <span>{option.label}</span>
              {#if option.sublabel}
                <span class="text-xs text-neutral-500 dark:text-neutral-400">{option.sublabel}</span>
              {/if}
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            {#if option.value !== '' && option.assetCount !== undefined && option.assetCount !== null}
              <Badge size="tiny" color="info">{option.assetCount}</Badge>
            {/if}
            {#if !multiselect && selected}
              <Icon icon={mdiCheck} class="text-primary dark:text-primary-light" size="18" />
            {/if}
          </div>
        </li>
      {/each}
    {/if}
  </ul>
</div>
