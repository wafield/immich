<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import ActionMenuItem from '$lib/components/ActionMenuItem.svelte';
  import UserPageLayout, { headerId } from '$lib/components/layouts/UserPageLayout.svelte';
  import ButtonContextMenu from '$lib/components/shared-components/context-menu/ButtonContextMenu.svelte';
  import GalleryViewer from '$lib/components/shared-components/gallery-viewer/GalleryViewer.svelte';
  import Breadcrumbs from '$lib/components/shared-components/tree/Breadcrumbs.svelte';
  import TreeItemThumbnails from '$lib/components/shared-components/tree/TreeItemThumbnails.svelte';
  import TreeItems from '$lib/components/shared-components/tree/TreeItems.svelte';
  import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
  import ArchiveAction from '$lib/components/timeline/actions/ArchiveAction.svelte';
  import ChangeDate from '$lib/components/timeline/actions/ChangeDateAction.svelte';
  import ChangeDescription from '$lib/components/timeline/actions/ChangeDescriptionAction.svelte';
  import ChangeLocation from '$lib/components/timeline/actions/ChangeLocationAction.svelte';
  import CreateSharedLink from '$lib/components/timeline/actions/CreateSharedLinkAction.svelte';
  import DeleteAssets from '$lib/components/timeline/actions/DeleteAssetsAction.svelte';
  import DownloadAction from '$lib/components/timeline/actions/DownloadAction.svelte';
  import FavoriteAction from '$lib/components/timeline/actions/FavoriteAction.svelte';
  import SetVisibilityAction from '$lib/components/timeline/actions/SetVisibilityAction.svelte';
  import TagAction from '$lib/components/timeline/actions/TagAction.svelte';
  import AssetSelectControlBar from '$lib/components/timeline/AssetSelectControlBar.svelte';
  import Dropdown from '$lib/elements/Dropdown.svelte';
  import SkipLink from '$lib/elements/SkipLink.svelte';
  import { assetMultiSelectManager } from '$lib/managers/asset-multi-select-manager.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import type { Viewport } from '$lib/managers/timeline-manager/types';
  import { Route } from '$lib/route';
  import { getAssetBulkActions } from '$lib/services/asset.service';
  import { foldersStore } from '$lib/stores/folders.svelte';
  import { FolderAssetsSortBy, folderViewSettings, SortOrder } from '$lib/stores/preferences.store';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { joinPaths } from '$lib/utils/tree-utils';
  import { ActionButton, CommandPaletteDefaultProvider, IconButton, Text } from '@immich/ui';
  import {
    mdiArrowDownThin,
    mdiArrowUpThin,
    mdiDotsVertical,
    mdiFolder,
    mdiFolderHome,
    mdiFolderOutline,
    mdiSelectAll,
  } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';
  import { getKeyboardActions } from '$lib/services/keyboard.service';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const viewport: Viewport = $state({ width: 0, height: 0 });

  const handleNavigateToFolder = (folderName: string) => navigateToView(joinPaths(data.tree.path, folderName));

  const getLinkForPath = (path: string) => Route.folders({ path });

  const navigateToView = (path: string) => {
    return goto(getLinkForPath(path), { keepFocus: true, noScroll: true });
  };

  const triggerAssetUpdate = async () => {
    assetMultiSelectManager.clear();
    if (data.tree.path) {
      await foldersStore.refreshAssetsByPath(data.tree.path);
    }
    await invalidateAll();
  };

  const handleSetVisibility = () => {
    void triggerAssetUpdate();
  };

  const selectedSortOption = $derived($folderViewSettings.sortBy);
  const sortIcon = $derived($folderViewSettings.sortOrder === SortOrder.Desc ? mdiArrowDownThin : mdiArrowUpThin);
  const sortByNames: Record<FolderAssetsSortBy, string> = $derived({
    [FolderAssetsSortBy.CaptureTime]: $t('sort_capture_time'),
    [FolderAssetsSortBy.AddedTime]: $t('sort_added_time'),
    [FolderAssetsSortBy.FileName]: $t('sort_file_name'),
  });

  const handleChangeSortBy = (sortBy: FolderAssetsSortBy) => {
    if ($folderViewSettings.sortBy === sortBy) {
      $folderViewSettings.sortOrder = $folderViewSettings.sortOrder === SortOrder.Asc ? SortOrder.Desc : SortOrder.Asc;
    } else {
      $folderViewSettings.sortBy = sortBy;
      // Sort order is always ascending by default.
      $folderViewSettings.sortOrder = SortOrder.Asc;
    }
  };

  const sortedAssets = $derived.by(() => {
    if (!data.pathAssets) {
      return [];
    }
    const assets = [...data.pathAssets];
    const sortBy = $folderViewSettings.sortBy;
    const sortOrder = $folderViewSettings.sortOrder;
    const isAsc = sortOrder === SortOrder.Asc;

    assets.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortBy) {
        case FolderAssetsSortBy.CaptureTime: {
          valA = a.localDateTime ? new Date(a.localDateTime).getTime() : 0;
          valB = b.localDateTime ? new Date(b.localDateTime).getTime() : 0;
          break;
        }
        case FolderAssetsSortBy.AddedTime: {
          valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        }
        case FolderAssetsSortBy.FileName: {
          valA = a.originalFileName || '';
          valB = b.originalFileName || '';
          if (typeof valA === 'string' && typeof valB === 'string') {
            return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          break;
        }
        // No default
      }

      if (valA < valB) {
        return isAsc ? -1 : 1;
      }
      if (valA > valB) {
        return isAsc ? 1 : -1;
      }
      return 0;
    });

    return assets;
  });

  const handleSelectAllAssets = () => {
    if (sortedAssets.length === 0) {
      return;
    }

    assetMultiSelectManager.selectAssets(sortedAssets.map((asset) => toTimelineAsset(asset)));
  };

  const { KeyboardShortcuts } = $derived(getKeyboardActions($t));
</script>

<UserPageLayout title={data.meta.title} actions={[KeyboardShortcuts]}>
  {#snippet buttons()}
    {#if data.pathAssets && data.pathAssets.length > 0}
      <Dropdown
        title={$t('sort_assets_by')}
        options={Object.values(FolderAssetsSortBy)}
        selectedOption={selectedSortOption}
        onSelect={handleChangeSortBy}
        render={(option) => ({
          title: sortByNames[option],
          icon: sortIcon,
        })}
      />
    {/if}
  {/snippet}
  {#snippet sidebar()}
    <Sidebar>
      <SkipLink target={`#${headerId}`} text={$t('skip_to_folders')} breakpoint="md" />
      <section>
        <Text class="mb-4 ps-4" size="small">{$t('explorer')}</Text>
        <div class="h-full">
          <TreeItems
            icons={{ default: mdiFolderOutline, active: mdiFolder }}
            tree={foldersStore.folders!}
            active={data.tree.path}
            getLink={getLinkForPath}
          />
        </div>
      </section>
    </Sidebar>
  {/snippet}

  <Breadcrumbs node={data.tree} icon={mdiFolderHome} title={$t('folders')} getLink={getLinkForPath} />

  <section class="mt-2 h-[calc(100%-(--spacing(25)))] immich-scrollbar overflow-auto">
    <TreeItemThumbnails items={data.tree.children} icon={mdiFolder} onClick={handleNavigateToFolder} />

    <!-- Assets -->
    {#if data.pathAssets && data.pathAssets.length > 0}
      <div bind:clientHeight={viewport.height} bind:clientWidth={viewport.width}>
        <GalleryViewer
          assets={sortedAssets}
          assetInteraction={assetMultiSelectManager}
          {viewport}
          showAssetName={true}
          pageHeaderOffset={54}
          onReload={triggerAssetUpdate}
        />
      </div>
    {/if}
  </section>
</UserPageLayout>

{#if assetMultiSelectManager.selectionActive}
  <AssetSelectControlBar>
    {@const Actions = getAssetBulkActions($t)}
    <CommandPaletteDefaultProvider name={$t('assets')} actions={Object.values(Actions)} />
    <CreateSharedLink />
    <IconButton
      shape="round"
      color="secondary"
      variant="ghost"
      aria-label={$t('select_all')}
      icon={mdiSelectAll}
      onclick={handleSelectAllAssets}
    />
    <ActionButton action={Actions.AddToAlbum} />
    <FavoriteAction
      removeFavorite={assetMultiSelectManager.isAllFavorite}
      onFavorite={function handleFavoriteUpdate(ids, isFavorite) {
        if (data.pathAssets && data.pathAssets.length > 0) {
          for (const id of ids) {
            const asset = data.pathAssets.find((asset) => asset.id === id);
            if (asset) {
              asset.isFavorite = isFavorite;
            }
          }
        }
      }}
    />

    <ButtonContextMenu icon={mdiDotsVertical} title={$t('menu')} direction="up">
      <DownloadAction menuItem />
      <ChangeDate menuItem />
      <ChangeDescription menuItem />
      <ChangeLocation menuItem />
      <ArchiveAction menuItem unarchive={assetMultiSelectManager.isAllArchived} onArchive={triggerAssetUpdate} />
      <SetVisibilityAction menuItem onVisibilitySet={handleSetVisibility} />
      {#if authManager.preferences.tags.enabled && assetMultiSelectManager.isAllUserOwned}
        <TagAction menuItem />
      {/if}
      <DeleteAssets menuItem onAssetDelete={triggerAssetUpdate} onUndoDelete={triggerAssetUpdate} />
      <hr />

      <ActionMenuItem action={Actions.RegenerateThumbnailJob} />
      <ActionMenuItem action={Actions.RefreshMetadataJob} />
      <ActionMenuItem action={Actions.TranscodeVideoJob} />
    </ButtonContextMenu>
  </AssetSelectControlBar>
{/if}
