<script lang="ts">
  import { languageManager } from '$lib/managers/language-manager.svelte';
  import { onDestroy } from 'svelte';

  interface Props {
    containerElement?: HTMLElement;
    panelWidth: number;
    minWidth?: number;
    ariaLabel?: string;
    onResize: (width: number) => void;
    onDraggingChange?: (isDragging: boolean) => void;
  }

  let {
    containerElement,
    panelWidth,
    minWidth = 280,
    ariaLabel = 'Resize panel',
    onResize,
    onDraggingChange,
  }: Props = $props();

  let isDragging = $state(false);

  const getMaxWidth = (containerWidth: number) => {
    return Math.max(minWidth, Math.min(containerWidth * 0.75, containerWidth - 250));
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    isDragging = true;
    onDraggingChange?.(true);
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) {
      return;
    }
    const rect = containerElement?.getBoundingClientRect() ?? {
      left: 0,
      right: innerWidth,
      width: innerWidth,
    };
    if (rect.width <= 0) {
      return;
    }

    const currentX = event.clientX;
    const rawWidth = languageManager.rtl ? currentX - rect.left : rect.right - currentX;
    const maxWidth = getMaxWidth(rect.width);
    const clampedWidth = Math.min(maxWidth, Math.max(minWidth, Math.round(rawWidth)));

    onResize(clampedWidth);
    dispatchEvent(new Event('resize'));
  };

  const stopDragging = (event?: PointerEvent) => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    onDraggingChange?.(false);
    if (event) {
      try {
        (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may have already been released
      }
    }
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    dispatchEvent(new Event('resize'));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const step = 20;
    const containerWidth = containerElement ? containerElement.getBoundingClientRect().width : innerWidth;
    const maxWidth = getMaxWidth(containerWidth);

    switch (event.key) {
      case 'ArrowLeft': {
        event.preventDefault();
        const delta = languageManager.rtl ? -step : step;
        onResize(Math.min(maxWidth, Math.max(minWidth, panelWidth + delta)));
        dispatchEvent(new Event('resize'));
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        const delta = languageManager.rtl ? step : -step;
        onResize(Math.min(maxWidth, Math.max(minWidth, panelWidth + delta)));
        dispatchEvent(new Event('resize'));
        break;
      }
      case 'Home': {
        event.preventDefault();
        onResize(minWidth);
        dispatchEvent(new Event('resize'));
        break;
      }
      case 'End': {
        event.preventDefault();
        onResize(maxWidth);
        dispatchEvent(new Event('resize'));
        break;
      }
    }
  };

  onDestroy(() => {
    if (!isDragging) {
      return;
    }
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    onDraggingChange?.(false);
  });
</script>

<svelte:window onpointerup={() => stopDragging()} onpointercancel={() => stopDragging()} />

<div
  role="slider"
  tabindex={0}
  aria-orientation="vertical"
  aria-valuenow={Math.round(panelWidth)}
  aria-valuemin={minWidth}
  aria-valuemax={containerElement ? Math.round(getMaxWidth(containerElement.getBoundingClientRect().width)) : 1000}
  aria-label={ariaLabel}
  class={[
    'group relative z-10 hidden w-3 shrink-0 cursor-col-resize touch-none items-center justify-center border-none bg-transparent p-0 transition-colors select-none sm:w-2 lg:flex',
    'row-span-4 row-start-1 h-full',
    isDragging ? 'bg-primary/20 dark:bg-primary/30' : 'hover:bg-gray-200/60 dark:hover:bg-gray-700/60',
  ]}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={stopDragging}
  onpointercancel={stopDragging}
  onkeydown={handleKeyDown}
>
  <!-- Expanded touch target for mobile/iPad fingers -->
  <div class="absolute -inset-x-3 inset-y-0 z-10 sm:-inset-x-2"></div>
  <div
    class={[
      'h-8 w-1 rounded-full transition-colors',
      isDragging ? 'bg-primary' : 'bg-gray-300 group-hover:bg-primary dark:bg-gray-600',
    ]}
  ></div>
</div>
