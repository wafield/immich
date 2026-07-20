<script lang="ts">
  import type { HeaderButtonActionItem } from '$lib/types';
  import {
    Breadcrumbs,
    Button,
    ContextMenuButton,
    HStack,
    MenuItemType,
    isMenuItemType,
    type BreadcrumbItem,
  } from '@immich/ui';
  import { mdiSlashForward } from '@mdi/js';
  import type { Snippet } from 'svelte';
  import { t } from 'svelte-i18n';

  type Props = {
    breadcrumbs?: BreadcrumbItem[];
    actions?: Array<HeaderButtonActionItem | MenuItemType>;
    children?: Snippet;
  };

  let { breadcrumbs = [], actions = [], children }: Props = $props();

  const enabledActions = $derived(
    actions
      .filter((action): action is HeaderButtonActionItem => !isMenuItemType(action))
      .filter((action) => action.$if?.() ?? true),
  );
</script>

<main class="relative rounded-lg bg-white dark:bg-immich-dark-bg">
  <div class="absolute flex h-16 w-full place-items-center justify-between p-4 text-dark">
    <Breadcrumbs items={breadcrumbs} separator={mdiSlashForward} />

    {#if enabledActions.length > 0}
      <div class="hidden md:block">
        <HStack gap={0}>
          {#each enabledActions as action, i (i)}
            <Button
              variant="ghost"
              size="small"
              color={action.color ?? 'secondary'}
              leadingIcon={action.icon}
              onclick={() => action.onAction(action)}
              title={action.data?.title}
            >
              {action.title}
            </Button>
          {/each}
        </HStack>
      </div>

      <ContextMenuButton aria-label={$t('open')} items={actions} class="md:hidden" />
    {/if}
  </div>
  <div class="absolute top-16 h-[calc(100%-(--spacing(16)))] w-full immich-scrollbar overflow-y-auto pr-2 pl-4">
    {@render children?.()}
  </div>
</main>
