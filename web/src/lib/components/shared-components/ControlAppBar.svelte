<script lang="ts">
  import { ControlBar, ControlBarContent, ControlBarHeader, ControlBarOverflow, ControlBarTitle } from '@immich/ui';
  import { mdiClose } from '@mdi/js';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  interface Props {
    backIcon?: string;
    class?: ClassValue;
    onClose?: () => void;
    title?: Snippet | string;
    leading?: Snippet;
    children?: Snippet;
    trailing?: Snippet;
    placement?: 'top' | 'bottom';
  }

  let {
    backIcon = mdiClose,
    class: className = '',
    onClose,
    title,
    leading,
    children,
    trailing,
    placement = 'top',
  }: Props = $props();
</script>

<div class="pointer-events-none absolute inset-x-0 flex justify-center {placement === 'bottom' ? 'bottom-4' : 'top-0'}">
  <div
    class="pointer-events-auto bg-transparent p-2 {placement === 'bottom' ? 'w-fit max-w-full' : 'w-full'}"
    id="control-bar"
  >
    <ControlBar closeIcon={backIcon} {onClose} shape="round" class={className}>
      {#if title || leading}
        <ControlBarHeader>
          {#if title}
            <ControlBarTitle>
              {#if typeof title === 'string'}
                {title}
              {:else}
                {@render title()}
              {/if}
            </ControlBarTitle>
          {/if}
          {@render leading?.()}
        </ControlBarHeader>
      {/if}

      {#if children}
        <ControlBarContent>
          {@render children()}
        </ControlBarContent>
      {/if}

      {#if trailing}
        <ControlBarOverflow>
          {@render trailing()}
        </ControlBarOverflow>
      {/if}
    </ControlBar>
  </div>
</div>
