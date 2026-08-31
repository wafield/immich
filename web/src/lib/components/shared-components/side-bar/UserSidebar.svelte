<script lang="ts">
  import BottomInfo from '$lib/components/shared-components/side-bar/BottomInfo.svelte';
  import RecentAlbums from '$lib/components/shared-components/side-bar/RecentAlbums.svelte';
  import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
  import { Route } from '$lib/route';
  import { AssetInfoDisplay } from '$lib/constants';
  import {
    recentAlbumsDropdown,
    hideScreenshots,
    selectedLibraries,
    showLibraryIndicator,
    highlightAlbumAssets,
    rowSize,
    RowSize,
    assetInfoDisplay,
  } from '$lib/stores/preferences.store';
  import { sidebarStore } from '$lib/stores/sidebar.svelte';
  import { loadUserLibraries, userLibraries } from '$lib/stores/library.store';
  import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
  import { NavbarGroup, NavbarItem, Checkbox, Label, Button, Select } from '@immich/ui';
  import { type LibraryResponseDto } from '@immich/sdk';
  import { onMount } from 'svelte';
  import {
    mdiAccount,
    mdiAccountMultiple,
    mdiAccountMultipleOutline,
    mdiAccountOutline,
    mdiArchiveArrowDown,
    mdiArchiveArrowDownOutline,
    mdiCards,
    mdiCardsOutline,
    mdiContentDuplicate,
    mdiCrosshairsGps,
    mdiFolderOutline,
    mdiHeart,
    mdiHeartOutline,
    mdiImageAlbum,
    mdiImageMultiple,
    mdiImageMultipleOutline,
    mdiImageSizeSelectLarge,
    mdiLink,
    mdiLock,
    mdiLockOutline,
    mdiMagnify,
    mdiMap,
    mdiMapOutline,
    mdiStateMachine,
    mdiTagMultipleOutline,
    mdiToolbox,
    mdiToolboxOutline,
    mdiTrashCan,
    mdiTrashCanOutline,
    mdiUploadOutline,
  } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { fly } from 'svelte/transition';

  let libraries = $state<LibraryResponseDto[]>([]);
  let utilitiesExpanded = $state(false);

  onMount(async () => {
    try {
      const fetched = await loadUserLibraries();
      libraries = fetched;
      if (localStorage.getItem('selected-libraries') === null) {
        $selectedLibraries = [...fetched.map((lib) => lib.id), 'null'];
      }
    } catch (error) {
      console.error('Failed to load libraries', error);
    }
  });

  $effect(() => {
    libraries = $userLibraries;
  });

  function handleLibraryChange(id: string) {
    $selectedLibraries = $selectedLibraries.includes(id)
      ? $selectedLibraries.filter((item) => item !== id)
      : [...$selectedLibraries, id];
  }
</script>

<Sidebar ariaLabel={$t('primary')}>
  <NavbarItem title={$t('photos')} href={Route.photos()} icon={mdiImageMultipleOutline} activeIcon={mdiImageMultiple} />

  {#if featureFlagsManager.value.search}
    <NavbarItem title={$t('explore')} href={Route.explore()} icon={mdiMagnify} />
  {/if}

  {#if featureFlagsManager.value.map}
    <NavbarItem title={$t('map')} href={Route.map()} icon={mdiMapOutline} activeIcon={mdiMap} />
  {/if}

  {#if authManager.preferences.memories.enabled && authManager.preferences.memories.sidebarWeb}
    <NavbarItem title={$t('memories')} href={Route.memories()} icon={mdiCardsOutline} activeIcon={mdiCards} />
  {/if}

  {#if authManager.preferences.people.enabled && authManager.preferences.people.sidebarWeb}
    <NavbarItem title={$t('people')} href={Route.people()} icon={mdiAccountOutline} activeIcon={mdiAccount} />
  {/if}

  {#if authManager.preferences.sharedLinks.enabled && authManager.preferences.sharedLinks.sidebarWeb}
    <NavbarItem title={$t('shared_links')} href={Route.sharedLinks()} icon={mdiLink} />
  {/if}

  <NavbarItem
    title={$t('sharing')}
    href={Route.sharing()}
    icon={mdiAccountMultipleOutline}
    activeIcon={mdiAccountMultiple}
  />

  {#if !(sidebarStore.isCollapsed && mediaQueryManager.isFullSidebar)}
    <NavbarGroup title="Collections" size="tiny" />
  {/if}

  <NavbarItem title={$t('favorites')} href={Route.favorites()} icon={mdiHeartOutline} activeIcon={mdiHeart} />

  <NavbarItem
    title={$t('albums')}
    href={Route.albums()}
    icon={{ icon: mdiImageAlbum, flipped: true }}
    bind:expanded={$recentAlbumsDropdown}
  >
    {#snippet items()}
      {#if !(sidebarStore.isCollapsed && mediaQueryManager.isFullSidebar)}
        <span in:fly={{ y: -20 }} class="hidden md:block">
          <RecentAlbums />
        </span>
      {/if}
    {/snippet}
  </NavbarItem>

  {#if authManager.preferences.tags.enabled && authManager.preferences.tags.sidebarWeb}
    <NavbarItem title={$t('tags')} href={Route.tags()} icon={{ icon: mdiTagMultipleOutline, flipped: true }} />
  {/if}

  {#if authManager.preferences.recentlyAdded.sidebarWeb}
    <NavbarItem
      title={$t('recently_added')}
      href={Route.recentlyAdded()}
      icon={{ icon: mdiUploadOutline, flipped: true }}
    />
  {/if}

  {#if authManager.preferences.folders.enabled && authManager.preferences.folders.sidebarWeb}
    <NavbarItem title={$t('folders')} href={Route.folders()} icon={{ icon: mdiFolderOutline, flipped: true }} />
  {/if}

  <NavbarItem
    title={$t('utilities')}
    href={Route.utilities()}
    icon={mdiToolboxOutline}
    activeIcon={mdiToolbox}
    bind:expanded={utilitiesExpanded}
    items={[
      {
        title: $t('review_duplicates'),
        href: Route.duplicatesUtility(),
        icon: mdiContentDuplicate,
      },
      {
        title: $t('review_large_files'),
        href: Route.largeFileUtility(),
        icon: mdiImageSizeSelectLarge,
      },
      {
        title: $t('manage_geolocation'),
        href: Route.geolocationUtility(),
        icon: mdiCrosshairsGps,
      },
      {
        title: $t('workflows'),
        href: Route.workflows(),
        icon: mdiStateMachine,
      },
    ]}
  />

  <NavbarItem
    title={$t('archive')}
    href={Route.archive()}
    icon={mdiArchiveArrowDownOutline}
    activeIcon={mdiArchiveArrowDown}
  />

  <NavbarItem title={$t('locked_folder')} href={Route.locked()} icon={mdiLockOutline} activeIcon={mdiLock} />

  {#if featureFlagsManager.value.trash}
    <NavbarItem title={$t('trash')} href={Route.trash()} icon={mdiTrashCanOutline} activeIcon={mdiTrashCan} />
  {/if}

  {#if !(sidebarStore.isCollapsed && mediaQueryManager.isFullSidebar)}
    <NavbarGroup title="Libraries" size="tiny" />
    <div class="flex flex-col gap-4 ps-5 pb-4">
      <div class="flex items-center gap-2">
        <Checkbox
          size="tiny"
          id="library-checkbox-default"
          checked={$selectedLibraries.includes('null')}
          onCheckedChange={() => handleLibraryChange('null')}
        />
        <Label label="Default Library" for="library-checkbox-default" size="tiny" />
        <span
          class="inline-block size-3 rounded-full border border-gray-300 dark:border-gray-600"
          style:background-color="#ffffff"
          title="Default Library"
        ></span>
      </div>
      {#each libraries as library (library.id)}
        <div class="flex items-center gap-2">
          <Checkbox
            size="tiny"
            id="library-checkbox-{library.id}"
            checked={$selectedLibraries.includes(library.id)}
            onCheckedChange={() => handleLibraryChange(library.id)}
          />
          <Label label={library.name} for="library-checkbox-{library.id}" size="tiny" />
          {#if library.uiColor}
            <span
              class="inline-block size-3 rounded-full border border-gray-300 dark:border-gray-600"
              style:background-color={library.uiColor}
              title={library.uiColor}
            ></span>
          {/if}
        </div>
      {/each}

      <hr class="border-gray-200 dark:border-gray-700" />

      <div class="flex items-start gap-2">
        <Checkbox
          size="tiny"
          id="library-indicator-checkbox"
          checked={$showLibraryIndicator}
          onCheckedChange={() => ($showLibraryIndicator = !$showLibraryIndicator)}
        />
        <Label label="Show Library Indicator" for="library-indicator-checkbox" size="tiny" />
      </div>

      <div class="flex items-start gap-2">
        <Checkbox
          size="tiny"
          id="highlight-album-assets-checkbox"
          checked={$highlightAlbumAssets}
          onCheckedChange={() => ($highlightAlbumAssets = !$highlightAlbumAssets)}
        />
        <Label label="Highlight Album Assets" for="highlight-album-assets-checkbox" size="tiny" />
      </div>
    </div>

    <NavbarGroup title="Info Display" size="tiny" />
    <div class="flex ps-5 pb-4 pe-4">
      <Select
        class="w-full"
        options={[
          { label: 'None', value: AssetInfoDisplay.NONE },
          { label: 'File name', value: AssetInfoDisplay.FILE_NAME },
          { label: 'File name, Camera and Time', value: AssetInfoDisplay.FILE_NAME_CAMERA_DATE_TIME },
          { label: 'Description', value: AssetInfoDisplay.DESCRIPTION },
        ]}
        bind:value={$assetInfoDisplay}
      />
    </div>

    <NavbarGroup title="Row size" size="tiny" />
    <div class="flex ps-5 pb-4 text-xs">
      <Button
        class="flex-1 rounded-s-full"
        size="small"
        color={$rowSize === RowSize.S ? 'primary' : 'secondary'}
        onclick={() => ($rowSize = RowSize.S)}
      >
        S
      </Button>
      <Button
        class="flex-1 rounded-none"
        size="small"
        color={$rowSize === RowSize.M ? 'primary' : 'secondary'}
        onclick={() => ($rowSize = RowSize.M)}
      >
        M
      </Button>
      <Button
        class="flex-1 rounded-e-full"
        size="small"
        color={$rowSize === RowSize.L ? 'primary' : 'secondary'}
        onclick={() => ($rowSize = RowSize.L)}
      >
        L
      </Button>
    </div>

    <NavbarGroup title="Screenshots" size="tiny" />

    <div class="flex ps-5 pb-4 text-xs">
      <Button
        class="flex-1 rounded-s-full"
        size="small"
        color={$hideScreenshots === false ? 'primary' : 'secondary'}
        onclick={() => ($hideScreenshots = false)}
      >
        Show
      </Button>
      <Button
        class="flex-1 rounded-e-full"
        size="small"
        color={$hideScreenshots === true ? 'primary' : 'secondary'}
        onclick={() => ($hideScreenshots = true)}
      >
        Hide
      </Button>
    </div>

    <BottomInfo />
  {/if}
</Sidebar>
