<script lang="ts">
  import { clickOutside } from '$lib/actions/click-outside';
  import { Button, Icon } from '@immich/ui';
  import { mdiCalendar, mdiChevronDown } from '@mdi/js';
  import { fly } from 'svelte/transition';

  export interface JumpToOption {
    date: string;
    label: string;
  }

  interface Props {
    options: JumpToOption[];
    onSelect: (date: string) => void;
    disabled?: boolean;
  }

  let { options, onSelect, disabled = false }: Props = $props();

  let isOpen = $state(false);
  let buttonContainer: HTMLDivElement | undefined = $state();
  let menuPosition = $state({ top: 0, left: 0 });

  const updatePosition = () => {
    if (!buttonContainer) {
      return;
    }
    const rect = buttonContainer.getBoundingClientRect();
    menuPosition = {
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(window.innerWidth - 280, rect.left)),
    };
  };

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
      isOpen = true;
    } else {
      isOpen = false;
    }
  };

  const handleSelect = (date: string) => {
    isOpen = false;
    onSelect(date);
  };
</script>

<svelte:window onresize={() => isOpen && updatePosition()} />

<div
  bind:this={buttonContainer}
  class="relative inline-block"
  use:clickOutside={{ onOutclick: () => (isOpen = false), onEscape: () => (isOpen = false) }}
>
  <Button
    variant="ghost"
    color="secondary"
    size="small"
    shape="round"
    trailingIcon={mdiChevronDown}
    disabled={disabled || options.length === 0}
    onclick={toggleOpen}
    aria-expanded={isOpen}
    aria-haspopup="true"
    aria-label="Jump to..."
  >
    Jump to...
  </Button>

  {#if isOpen && options.length > 0}
    <div
      in:fly={{ y: -10, duration: 150 }}
      class="fixed z-70 max-h-60 w-max min-w-56 max-w-sm overflow-y-auto rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl immich-scrollbar dark:border-gray-700 dark:bg-gray-800"
      style:top="{menuPosition.top}px"
      style:left="{menuPosition.left}px"
      role="menu"
    >
      {#each options as option (option.date)}
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-2 px-3 py-2 text-start text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary dark:text-gray-200 dark:hover:bg-gray-700/80 dark:hover:text-primary-300"
          onclick={() => handleSelect(option.date)}
        >
          <Icon icon={mdiCalendar} size="16" class="shrink-0 text-gray-400 dark:text-gray-500" />
          <span class="truncate" title={option.label}>
            {option.label}
          </span>
        </button>
      {/each}
    </div>
  {/if}
</div>
