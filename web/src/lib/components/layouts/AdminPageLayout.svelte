<script lang="ts">
  import BreadcrumbActionPage from '#lib/components/BreadcrumbActionPage.svelte';
  import NavigationBar from '#lib/components/shared-components/navigation-bar/NavigationBar.svelte';
  import BottomInfo from '#lib/components/shared-components/side-bar/BottomInfo.svelte';
  import Sidebar from '#lib/components/sidebar/Sidebar.svelte';
  import { featureFlagsManager } from '#lib/managers/feature-flags-manager.svelte.ts';
  import { Route } from '#lib/route.ts';
  import { sidebarStore } from '#lib/stores/sidebar.svelte.ts';
  import type { HeaderButtonActionItem } from '#lib/types.ts';
  import { ImmichBackupsAdminNavButton } from '@futo-org/backups-orchestrator-ui';
  import { MenuItemType, NavbarItem, type BreadcrumbItem } from '@immich/ui';
  import { mdiAccountMultipleOutline, mdiBookshelf, mdiCog, mdiServer, mdiTrayFull, mdiWrench } from '@mdi/js';
  import type { Snippet } from 'svelte';
  import { t } from 'svelte-i18n';

  type Props = {
    breadcrumbs: BreadcrumbItem[];
    actions?: Array<HeaderButtonActionItem | MenuItemType>;
    children?: Snippet;
  };

  let { breadcrumbs, actions, children }: Props = $props();
</script>

<header class="bg-immich-bg dark:bg-immich-dark-gray">
  <NavigationBar noBorder />
</header>
<div
  tabindex="-1"
  class={[
    'relative z-0 grid grid-cols-[--spacing(0)_auto] overflow-hidden',
    sidebarStore.isCollapsed && sidebarStore.isVisible
      ? 'sidebar:grid-cols-[--spacing(18)_auto]'
      : 'sidebar:grid-cols-[--spacing(64)_auto]',
    'h-[calc(100dvh-var(--navbar-height))] max-md:h-[calc(100dvh-var(--navbar-height-md))]',
  ]}
>
  <Sidebar>
    {#if featureFlagsManager.value.backups}
      <ImmichBackupsAdminNavButton href={Route.backups()} />
    {/if}
    <NavbarItem title={$t('users')} href={Route.users()} icon={mdiAccountMultipleOutline} />
    <NavbarItem title={$t('external_libraries')} href={Route.libraries()} icon={mdiBookshelf} />
    <NavbarItem title={$t('admin.queues')} href={Route.queues()} icon={mdiTrayFull} />
    <NavbarItem title={$t('settings')} href={Route.systemSettings()} icon={mdiCog} />
    <NavbarItem title={$t('admin.maintenance_settings')} href={Route.systemMaintenance()} icon={mdiWrench} />
    <NavbarItem title={$t('server_stats')} href={Route.systemStatistics()} icon={mdiServer} />
    {#if !sidebarStore.isCollapsed}
      <BottomInfo />
    {/if}
  </Sidebar>

  <BreadcrumbActionPage {breadcrumbs} {actions}>
    {@render children?.()}
  </BreadcrumbActionPage>
</div>
