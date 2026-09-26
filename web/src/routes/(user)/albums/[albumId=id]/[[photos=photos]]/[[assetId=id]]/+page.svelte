<script lang="ts">
  import { browser } from '$app/environment';
  import { goto, invalidate, onNavigate } from '$app/navigation';
  import { navigating } from '$app/state';
  import { timeToLoadTheMap } from '$lib/constants';
  import { LoadingSpinner } from '@immich/ui';
  import AlbumSummary from '$lib/components/album-page/AlbumSummary.svelte';
  import ActivityStatus from '$lib/components/asset-viewer/ActivityStatus.svelte';
  import ActivityViewer from '$lib/components/asset-viewer/ActivityViewer.svelte';
  import HeaderActionButton from '$lib/components/HeaderActionButton.svelte';
  import OnEvents from '$lib/components/OnEvents.svelte';
  import ButtonContextMenu from '$lib/components/shared-components/context-menu/ButtonContextMenu.svelte';
  import MenuOption from '$lib/components/shared-components/context-menu/MenuOption.svelte';
  import UserAvatar from '$lib/components/shared-components/UserAvatar.svelte';
  import ArchiveAction from '$lib/components/timeline/actions/ArchiveAction.svelte';
  import ChangeDate from '$lib/components/timeline/actions/ChangeDateAction.svelte';
  import ChangeDescription from '$lib/components/timeline/actions/ChangeDescriptionAction.svelte';
  import ChangeLocation from '$lib/components/timeline/actions/ChangeLocationAction.svelte';
  import CreateSharedLink from '$lib/components/timeline/actions/CreateSharedLinkAction.svelte';
  import DeleteAssets from '$lib/components/timeline/actions/DeleteAssetsAction.svelte';
  import DownloadAction from '$lib/components/timeline/actions/DownloadAction.svelte';
  import FavoriteAction from '$lib/components/timeline/actions/FavoriteAction.svelte';
  import MoveToLibraryAction from '$lib/components/timeline/actions/MoveToLibraryAction.svelte';
  import SelectAllAssets from '$lib/components/timeline/actions/SelectAllAction.svelte';
  import SetVisibilityAction from '$lib/components/timeline/actions/SetVisibilityAction.svelte';
  import TagAction from '$lib/components/timeline/actions/TagAction.svelte';
  import AssetSelectControlBar from '$lib/components/timeline/AssetSelectControlBar.svelte';
  import Timeline from '$lib/components/timeline/Timeline.svelte';
  import UserPageLayout from '$lib/components/layouts/UserPageLayout.svelte';
  import { delay, getOwnedAssetsWithWarning } from '$lib/utils/asset-utils';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { AlbumPageViewMode } from '$lib/constants';
  import { getStackBulkActions } from '$lib/services/stack.service';
  import { activityManager } from '$lib/managers/activity-manager.svelte';
  import { assetMultiSelectManager, AssetMultiSelectManager } from '$lib/managers/asset-multi-select-manager.svelte';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { eventManager } from '$lib/managers/event-manager.svelte';
  import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
  import { languageManager } from '$lib/managers/language-manager.svelte';
  import { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import AlbumOptionsModal from '$lib/modals/AlbumOptionsModal.svelte';
  import { Route } from '$lib/route';
  import {
    getAlbumActions,
    getAlbumAssetsActions,
    handleDeleteAlbum,
    handleDownloadAlbum,
  } from '$lib/services/album.service';
  import { getGlobalActions } from '$lib/services/app.service';
  import { getAssetBulkActions } from '$lib/services/asset.service';
  import { highlightMissingGps } from '$lib/stores/preferences.store';
  import { SlideshowNavigation, SlideshowState, slideshowStore } from '$lib/stores/slideshow.store';
  import { handlePromiseError, isValidLatLng, isValidMapHash } from '$lib/utils';
  import { calculateCentroid, getAssetCoordinates } from '$lib/utils/geo-utils';
  import { handleError } from '$lib/utils/handle-error';
  import { isAlbumsRoute, navigate, type AssetGridRouteSearchParams } from '$lib/utils/navigation';
  import {
    AlbumUserRole,
    AssetVisibility,
    getAlbumInfo,
    updateAlbumInfo,
    updateAssets,
    getAlbumMapMarkers,
    type AlbumResponseDto,
    type MapMarkerResponseDto,
  } from '@immich/sdk';
  import {
    ActionButton,
    Button,
    CommandPaletteDefaultProvider,
    Icon,
    IconButton,
    modalManager,
    toastManager,
  } from '@immich/ui';
  import {
    mdiAccountEye,
    mdiAccountEyeOutline,
    mdiArrowLeft,
    mdiClose,
    mdiCogOutline,
    mdiDeleteOutline,
    mdiDotsHorizontal,
    mdiDotsVertical,
    mdiDownload,
    mdiImageOutline,
    mdiImagePlusOutline,
    mdiLink,
    mdiMap,
    mdiMapMarker,
    mdiMapMarkerStarOutline,
    mdiMapOutline,
    mdiPlus,
    mdiPresentationPlay,
  } from '@mdi/js';
  import { onDestroy, onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import { fly } from 'svelte/transition';
  import type { PageData } from './$types';
  import AlbumDescription from './AlbumDescription.svelte';
  import AlbumTitle from './AlbumTitle.svelte';
  import ActionMenuItem from '$lib/components/ActionMenuItem.svelte';
  import type MapComponent from '$lib/components/shared-components/map/Map.svelte';

  interface Props {
    data: PageData;
  }

  let { data = $bindable() }: Props = $props();
  let { slideshowState, slideshowNavigation } = slideshowStore;
  let oldAt: AssetGridRouteSearchParams | null | undefined = $state();
  let viewMode: AlbumPageViewMode = $state(AlbumPageViewMode.VIEW);
  let timelineManager = $state<TimelineManager>() as TimelineManager;
  let timelineComponent = $state<Timeline>();
  let mapComponent = $state<MapComponent>();

  const handleAssetGpsClick = (asset: TimelineAsset) => {
    const lat = asset.latitude ?? (asset as any).exifInfo?.latitude;
    const lng = asset.longitude ?? (asset as any).exifInfo?.longitude;
    if (isValidLatLng(lat, lng)) {
      mapComponent?.easeTo({ lat, lng });
    }
  };

  const handleMapSelect = async (assetIds: string[]) => {
    if (!assetIds || assetIds.length === 0) {
      return;
    }
    const firstAssetId = assetIds[0];
    await timelineComponent?.scrollToAsset(firstAssetId);
  };
  let showAlbumUsers = $derived(timelineManager?.showAssetOwners ?? false);
  let showAlbumMap = $state(browser && isValidMapHash(location.hash));

  const toggleAlbumMap = () => {
    showAlbumMap = !showAlbumMap;
    if (!showAlbumMap && browser && location.hash) {
      history.replaceState(history.state, '', location.pathname + location.search);
    }
  };
  let showMissingGps = $derived(showAlbumMap);
  let hoveredAsset = $state<TimelineAsset | null>(null);
  let hoverCoordinate = $derived(
    showAlbumMap &&
      viewMode === AlbumPageViewMode.VIEW &&
      hoveredAsset &&
      isValidLatLng(hoveredAsset.latitude, hoveredAsset.longitude)
      ? { latitude: hoveredAsset.latitude, longitude: hoveredAsset.longitude }
      : null,
  );

  $effect(() => {
    $highlightMissingGps = showAlbumMap;
  });
  let cancelable: AbortController;
  let mapMarkers: MapMarkerResponseDto[] = $state([]);
  let albumContainer: HTMLDivElement | undefined = $state();
  let mapWidthRatio = $state(1 / 2);
  let isDragging = $state(false);
  let mapCenter = $state<{ lat: number; lng: number }>();

  /** Whether the user has kicked off setting GPS on selected assets. */
  let isSettingGps = $state(false);

  const isInGeoSelectionMode = $derived(
    showAlbumMap &&
      viewMode === AlbumPageViewMode.VIEW &&
      assetMultiSelectManager.assets.length > 0 &&
      assetMultiSelectManager.isAllMissingGPS,
  );

  const getAssetTimestamp = (asset: TimelineAsset): number | null => {
    const dt = asset.localDateTime;
    if (!dt) {
      return null;
    }
    return Date.UTC(
      dt.year,
      (dt.month ?? 1) - 1,
      dt.day ?? 1,
      dt.hour ?? 0,
      dt.minute ?? 0,
      dt.second ?? 0,
      dt.millisecond ?? 0,
    );
  };

  const suggestedGps = $derived.by(() => {
    if (!isInGeoSelectionMode || !timelineManager) {
      return null;
    }

    const selected = assetMultiSelectManager.assets;
    if (selected.length === 0) {
      return null;
    }

    const selectedTimes = selected.map((element) => getAssetTimestamp(element)).filter((t): t is number => t !== null);

    if (selectedTimes.length === 0) {
      return null;
    }

    const minSelectedTime = Math.min(...selectedTimes);
    const maxSelectedTime = Math.max(...selectedTimes);

    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const windowStart = minSelectedTime - FIVE_MINUTES_MS;
    const windowEnd = maxSelectedTime + FIVE_MINUTES_MS;

    const selectedIds = new Set(selected.map((a) => a.id));
    const allTimelineAssets = timelineManager.months?.flatMap((m) => m.getAssets()) ?? [];

    const markerMap = new Map(mapMarkers.map((m) => [m.id, { lat: m.lat, lng: m.lon }]));
    const seenAssetIds = new Set<string>(selectedIds);
    const surroundingGpsPoints: { lat: number; lng: number }[] = [];

    for (const asset of allTimelineAssets) {
      if (seenAssetIds.has(asset.id)) {
        continue;
      }
      seenAssetIds.add(asset.id);

      const time = getAssetTimestamp(asset);
      if (time === null || time < windowStart || time > windowEnd) {
        continue;
      }

      const markerCoord = markerMap.get(asset.id);
      const coords =
        getAssetCoordinates(asset) ??
        (markerCoord && isValidLatLng(markerCoord.lat, markerCoord.lng) ? markerCoord : null);
      if (coords) {
        surroundingGpsPoints.push(coords);
      }
    }

    if (surroundingGpsPoints.length === 0) {
      return null;
    }

    return calculateCentroid(surroundingGpsPoints);
  });

  const handleSetGpsFromMapPin = async () => {
    if (!mapCenter) {
      return;
    }

    const ids = getOwnedAssetsWithWarning(assetMultiSelectManager.assets, authManager.user);
    if (ids.length === 0) {
      return;
    }

    isSettingGps = true;
    try {
      const lat = Number(mapCenter.lat.toFixed(7));
      const lng = Number(mapCenter.lng.toFixed(7));

      await updateAssets({
        assetBulkUpdateDto: {
          ids,
          latitude: lat,
          longitude: lng,
        },
      });

      for (const asset of assetMultiSelectManager.assets) {
        if (!ids.includes(asset.id)) {
          continue;
        }
        asset.latitude = lat;
        asset.longitude = lng;
      }
      timelineManager?.upsertAssets(
        assetMultiSelectManager.assets
          .filter((asset) => ids.includes(asset.id))
          .map((asset) => ({ ...asset, latitude: lat, longitude: lng })),
      );

      mapMarkers = await loadMapMarkers();
      assetMultiSelectManager.clear();
    } catch (error) {
      handleError(error, $t('errors.unable_to_update_location'));
    } finally {
      isSettingGps = false;
    }
  };

  const MIN_MAP_RATIO = 0.25;
  const MAX_MAP_RATIO = 0.7;

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    isDragging = true;
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging || !albumContainer) {
      return;
    }
    const rect = albumContainer.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const currentX = event.clientX;
    const rawRatio = languageManager.rtl ? (rect.right - currentX) / rect.width : (currentX - rect.left) / rect.width;

    mapWidthRatio = Math.min(MAX_MAP_RATIO, Math.max(MIN_MAP_RATIO, rawRatio));
    dispatchEvent(new Event('resize'));
  };

  const stopDragging = (event?: PointerEvent) => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
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
    const step = 0.02;
    switch (event.key) {
      case 'ArrowLeft': {
        event.preventDefault();
        const delta = languageManager.rtl ? step : -step;
        mapWidthRatio = Math.min(MAX_MAP_RATIO, Math.max(MIN_MAP_RATIO, mapWidthRatio + delta));
        dispatchEvent(new Event('resize'));
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        const delta = languageManager.rtl ? -step : step;
        mapWidthRatio = Math.min(MAX_MAP_RATIO, Math.max(MIN_MAP_RATIO, mapWidthRatio + delta));
        dispatchEvent(new Event('resize'));
        break;
      }
      case 'Home': {
        event.preventDefault();
        mapWidthRatio = MIN_MAP_RATIO;
        dispatchEvent(new Event('resize'));
        break;
      }
      case 'End': {
        event.preventDefault();
        mapWidthRatio = MAX_MAP_RATIO;
        dispatchEvent(new Event('resize'));
        break;
      }
    }
  };

  const timelineMultiSelectManager = new AssetMultiSelectManager();

  onMount(async () => {
    mapMarkers = await loadMapMarkers();
  });

  onDestroy(() => {
    cancelable?.abort();
    if (isDragging) {
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    }
    $highlightMissingGps = false;
  });

  const handleFavorite = async () => {
    try {
      await activityManager.toggleLike();
    } catch (error) {
      handleError(error, $t('errors.cant_change_asset_favorite'));
    }
  };

  const handleStartSlideshow = async () => {
    const asset =
      $slideshowNavigation === SlideshowNavigation.Shuffle
        ? await timelineManager.getRandomAsset()
        : timelineManager.months[0]?.timelineDays[0]?.viewerAssets[0]?.asset;
    if (asset) {
      handlePromiseError(
        assetViewerManager.setAssetId(asset.id).then(() => ($slideshowState = SlideshowState.PlaySlideshow)),
      );
    }
  };

  const handleEscape = async () => {
    timelineManager.suspendTransitions = true;
    if (viewMode === AlbumPageViewMode.SELECT_THUMBNAIL) {
      viewMode = AlbumPageViewMode.VIEW;
      return;
    }
    if (viewMode === AlbumPageViewMode.SELECT_ASSETS) {
      await handleCloseSelectAssets();
      return;
    }
    if (assetViewerManager.isViewing) {
      return;
    }
    if (assetMultiSelectManager.selectionActive) {
      assetMultiSelectManager.clear();
      return;
    }
    await goto(Route.albums());
  };

  const refreshAlbum = async () => {
    album = await getAlbumInfo({ id: album.id });
  };

  const setModeToView = async () => {
    timelineManager.suspendTransitions = true;
    viewMode = AlbumPageViewMode.VIEW;
    await navigate(
      { targetRoute: 'current', assetId: null, assetGridRouteSearchParams: { at: oldAt?.at } },
      { replaceState: true, forceNavigate: true },
    );
    oldAt = null;
  };

  const handleCloseSelectAssets = async () => {
    timelineMultiSelectManager.clear();
    await setModeToView();
  };

  const handleSetVisibility = (assetIds: string[]) => {
    timelineManager.removeAssets(assetIds);
    assetMultiSelectManager.clear();
  };

  const onAlbumRemoveAssets = async ({ assetIds, albumIds }: { assetIds: string[]; albumIds: string[] }) => {
    if (albumIds.includes(album.id)) {
      await handleRemoveAssets(assetIds);
    }
  };

  const handleRemoveAssets = async (assetIds: string[]) => {
    timelineManager.removeAssets(assetIds);
    await refreshAlbum();
  };

  const handleUndoRemoveAssets = async (assets: TimelineAsset[]) => {
    timelineManager.upsertAssets(assets);
    await refreshAlbum();
  };

  const handleUpdateThumbnail = async (assetId: string) => {
    if (viewMode !== AlbumPageViewMode.SELECT_THUMBNAIL) {
      return;
    }

    await updateThumbnail(assetId);

    viewMode = AlbumPageViewMode.VIEW;
    assetMultiSelectManager.clear();
  };

  const updateThumbnailUsingCurrentSelection = async () => {
    if (assetMultiSelectManager.assets.length !== 1) {
      return;
    }

    const [firstAsset] = assetMultiSelectManager.assets;
    assetMultiSelectManager.clear();
    await updateThumbnail(firstAsset.id);
  };

  const updateThumbnail = async (assetId: string) => {
    try {
      const response = await updateAlbumInfo({
        id: album.id,
        updateAlbumDto: {
          albumThumbnailAssetId: assetId,
        },
      });
      eventManager.emit('AlbumUpdate', response);
      toastManager.primary($t('album_cover_updated'));
    } catch (error) {
      handleError(error, $t('errors.unable_to_update_album_cover'));
    }
  };

  onNavigate(async ({ to }) => {
    if (!isAlbumsRoute(to?.route.id) && album.assetCount === 0 && !album.albumName) {
      await handleDeleteAlbum(album, { notify: false, prompt: false });
    }
  });

  let album = $state(data.album);
  let albumId = $derived(album.id);

  const containsEditors = $derived(album?.shared && album.albumUsers.some(({ role }) => role === AlbumUserRole.Editor));
  const albumUsers = $derived(showAlbumUsers && containsEditors ? album.albumUsers.map(({ user }) => user) : []);

  $effect(() => {
    if (!album.isActivityEnabled && activityManager.commentCount === 0) {
      assetViewerManager.closeActivityPanel();
    }
  });

  const options = $derived.by(() => {
    if (viewMode === AlbumPageViewMode.SELECT_ASSETS) {
      // Show all user-visible assets to allow the user to add non-album assets to this album.
      return {
        visibility: AssetVisibility.Timeline,
        withPartners: true,
        timelineAlbumId: albumId,
      };
    }

    // For all other modes, display assets in the current album only.
    return { albumId, order: album.order };
  });

  const isShared = $derived(viewMode === AlbumPageViewMode.SELECT_ASSETS ? false : album.albumUsers.length > 1);

  $effect(() => {
    if (assetViewerManager.isViewing || !isShared) {
      return;
    }

    handlePromiseError(activityManager.init(album.id));
  });

  onDestroy(() => activityManager.reset());

  const isOwned = $derived(album.albumUsers[0].user.id === authManager.user.id);

  let showActivityStatus = $derived(
    album.albumUsers.length > 1 &&
      !assetViewerManager.isViewing &&
      (album.isActivityEnabled || activityManager.commentCount > 0),
  );
  const isEditor = $derived(
    album.albumUsers.find(({ user: { id } }) => id === authManager.user.id)?.role === AlbumUserRole.Editor || isOwned,
  );

  let albumHasViewers = $derived(album.albumUsers.some(({ role }) => role === AlbumUserRole.Viewer));
  const isSelectionMode = $derived(
    viewMode === AlbumPageViewMode.SELECT_ASSETS ? true : viewMode === AlbumPageViewMode.SELECT_THUMBNAIL,
  );
  const singleSelect = $derived(
    viewMode === AlbumPageViewMode.SELECT_ASSETS ? false : viewMode === AlbumPageViewMode.SELECT_THUMBNAIL,
  );
  const showArchiveIcon = $derived(viewMode !== AlbumPageViewMode.SELECT_ASSETS);
  const onSelect = ({ id }: { id: string }) => {
    if (viewMode !== AlbumPageViewMode.SELECT_ASSETS) {
      void handleUpdateThumbnail(id);
    }
  };
  const currentAssetIntersection = $derived(
    viewMode === AlbumPageViewMode.SELECT_ASSETS ? timelineMultiSelectManager : assetMultiSelectManager,
  );

  const onSharedLinkCreate = async () => {
    await refreshAlbum();
  };

  const onAlbumDelete = async ({ id }: AlbumResponseDto) => {
    if (id !== album.id) {
      return;
    }

    await goto(Route.albums());
    viewMode = AlbumPageViewMode.VIEW;
  };

  const onAlbumAddAssets = async ({ albumIds, assetIds }: { albumIds: string[]; assetIds: string[] }) => {
    if (!albumIds.includes(album.id)) {
      return;
    }

    album = { ...album, assetCount: album.assetCount + assetIds.length };

    timelineMultiSelectManager.clear();
    await setModeToView();
  };

  const onAlbumShare = async () => {
    await refreshAlbum();
    await setModeToView();
  };

  const onAlbumUserUpdate = ({ albumId, userId, role }: { albumId: string; userId: string; role: AlbumUserRole }) => {
    if (albumId !== album.id) {
      return;
    }

    const albumUsers = album.albumUsers.map((albumUser) =>
      albumUser.user.id === userId ? { ...albumUser, role } : albumUser,
    );
    album = { ...album, albumUsers };
  };

  const onAlbumUpdate = async (newAlbum: AlbumResponseDto) => {
    album = newAlbum;

    // invalidating during navigation causes an infinite page load
    await navigating.complete;

    await invalidate('album:data');
  };

  const { Cast } = $derived(getGlobalActions($t));
  const { Share, Leave } = $derived(getAlbumActions($t, album));
  const { AddAssets, Upload } = $derived(getAlbumAssetsActions($t, album, timelineMultiSelectManager.assets));

  const Close = $derived({
    title: $t('go_back'),
    icon: mdiArrowLeft,
    onAction: handleEscape,
    $if: () => !assetViewerManager.isViewing,
    shortcuts: { key: 'Escape' },
  });

  // Load all markers (asset IDs and coordinates) to be shown on map.
  const loadMapMarkers = async () => {
    cancelable?.abort();
    cancelable = new AbortController();

    try {
      return await getAlbumMapMarkers({ ...authManager.params, id: album.id }, { signal: cancelable.signal });
    } catch (error) {
      handleError(error, $t('errors.something_went_wrong'));
      return [];
    }
  };
</script>

<OnEvents
  {onSharedLinkCreate}
  onSharedLinkDelete={refreshAlbum}
  {onAlbumDelete}
  {onAlbumAddAssets}
  {onAlbumRemoveAssets}
  {onAlbumShare}
  {onAlbumUserUpdate}
  onAlbumUserDelete={refreshAlbum}
  {onAlbumUpdate}
/>
<CommandPaletteDefaultProvider name={$t('album')} actions={[AddAssets, Upload, Close]} />

<svelte:window
  onpointerup={() => stopDragging()}
  onpointercancel={() => stopDragging()}
  onhashchange={() => {
    if (isValidMapHash(location.hash) && !showAlbumMap) {
      showAlbumMap = true;
    }
  }}
/>

<UserPageLayout scrollbar={false}>
  <div bind:this={albumContainer} class={['flex size-full flex-row', { 'select-none': isDragging }]}>
    {#if showAlbumMap && viewMode === AlbumPageViewMode.VIEW}
      <div
        class={['h-full min-h-0 shrink-0', { 'pointer-events-none': isDragging }]}
        style:width="{mapWidthRatio * 100}%"
      >
        {#await import('$lib/components/shared-components/map/Map.svelte')}
          {#await delay(timeToLoadTheMap) then}
            <!-- show the loading spinner only if loading the map takes too much time -->
            <div class="flex size-full items-center justify-center">
              <LoadingSpinner />
            </div>
          {/await}
        {:then { default: Map }}
          <Map
            bind:this={mapComponent}
            hash
            {mapMarkers}
            showSettings={false}
            onSelect={handleMapSelect}
            {hoverCoordinate}
            showCenterPin={isInGeoSelectionMode}
            onCenterChange={(coords) => (mapCenter = coords)}
          />
        {/await}
      </div>

      <div
        role="slider"
        tabindex={0}
        aria-orientation="vertical"
        aria-valuenow={Math.round(mapWidthRatio * 100)}
        aria-valuemin={25}
        aria-valuemax={70}
        aria-label="Resize map"
        class={[
          'group relative flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center border-none bg-transparent p-0 transition-colors select-none sm:w-2',
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
    {/if}

    <div
      class={[
        showAlbumMap && viewMode === AlbumPageViewMode.VIEW ? 'pe-2' : 'w-full',
        'flex h-full min-h-0 min-w-0 flex-1 flex-col md:-me-3 md:-ms-1',
        { 'pointer-events-none': isDragging },
      ]}
    >
      <header
        id="album-menu-bar"
        class="flex h-12 shrink-0 items-center justify-between gap-4 overflow-x-auto overflow-y-hidden rounded-t-lg bg-primary-200 px-4 scrollbar-hidden dark:bg-primary-100"
        onwheel={(e) => {
          if (e.deltaY !== 0 && e.deltaX === 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        {#if viewMode === AlbumPageViewMode.VIEW}
          <div class="flex shrink-0 items-center gap-1 [&>*]:shrink-0">
            <IconButton
              icon={mdiArrowLeft}
              color="secondary"
              shape="round"
              variant="ghost"
              aria-label={$t('back')}
              onclick={() => goto(Route.albums())}
            />

            <div class="mx-1 h-5 w-px shrink-0 bg-gray-300 dark:bg-gray-700"></div>

            {#if isEditor}
              <IconButton
                variant="ghost"
                color="secondary"
                shape="round"
                aria-label={$t('add_photos')}
                onclick={async () => {
                  timelineManager.suspendTransitions = true;
                  viewMode = AlbumPageViewMode.SELECT_ASSETS;
                  oldAt = { at: assetViewerManager.gridScrollTarget?.at };
                  await navigate(
                    { targetRoute: 'current', assetId: null, assetGridRouteSearchParams: { at: null } },
                    { replaceState: true },
                  );
                }}
                icon={mdiImagePlusOutline}
              />
            {/if}

            {#if featureFlagsManager.value.map}
              <IconButton
                variant="ghost"
                color={showAlbumMap ? 'primary' : 'secondary'}
                shape="round"
                icon={showAlbumMap ? mdiMap : mdiMapOutline}
                onclick={toggleAlbumMap}
                aria-label={$t('map')}
              />
            {/if}

            <ActionButton action={Cast} />

            {#if isOwned || containsEditors}
              <div class="mx-1 h-5 w-px shrink-0 bg-gray-300 dark:bg-gray-700"></div>

              {#if containsEditors}
                <IconButton
                  variant="ghost"
                  color="secondary"
                  shape="round"
                  icon={showAlbumUsers ? mdiAccountEye : mdiAccountEyeOutline}
                  aria-label={showAlbumUsers ? $t('hide_asset_owners') : $t('view_asset_owners')}
                  onclick={() => timelineManager.toggleShowAssetOwners()}
                />
              {/if}
              {#if isOwned && album.assetCount > 0}
                <IconButton
                  variant="ghost"
                  color="secondary"
                  shape="round"
                  icon={mdiImageOutline}
                  aria-label={$t('select_album_cover')}
                  onclick={() => (viewMode = AlbumPageViewMode.SELECT_THUMBNAIL)}
                />
                <IconButton
                  variant="ghost"
                  color="secondary"
                  shape="round"
                  icon={mdiCogOutline}
                  aria-label={$t('options')}
                  onclick={() => modalManager.show(AlbumOptionsModal, { album })}
                />
              {/if}

              {#if showAlbumMap && isInGeoSelectionMode && suggestedGps}
                <IconButton
                  color="primary"
                  shape="round"
                  size="small"
                  aria-label="Suggested GPS"
                  icon={mdiMapMarkerStarOutline}
                  onclick={() => mapComponent?.easeTo(suggestedGps)}
                  disabled={isSettingGps}
                />
              {/if}
              {#if showAlbumMap && isInGeoSelectionMode && mapCenter}
                <Button
                  color="primary"
                  shape="round"
                  size="small"
                  leadingIcon={mdiMapMarker}
                  onclick={handleSetGpsFromMapPin}
                  loading={isSettingGps}
                  disabled={isSettingGps}
                >
                  Set GPS ({mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)})
                </Button>
              {/if}

              <ButtonContextMenu
                icon={mdiDotsVertical}
                title={$t('album_options')}
                color="secondary"
                offset={{ x: 175, y: 25 }}
              >
                <ActionMenuItem action={Share} />

                {#if containsEditors}
                  <MenuOption
                    icon={showAlbumUsers ? mdiAccountEye : mdiAccountEyeOutline}
                    text={showAlbumUsers ? $t('hide_asset_owners') : $t('view_asset_owners')}
                    onClick={() => timelineManager.toggleShowAssetOwners()}
                  />
                {/if}
                {#if album.assetCount > 0}
                  <MenuOption icon={mdiPresentationPlay} text={$t('slideshow')} onClick={handleStartSlideshow} />
                  <MenuOption icon={mdiDownload} text={$t('download')} onClick={() => handleDownloadAlbum(album)} />
                {/if}

                {#if isOwned}
                  <MenuOption
                    icon={mdiDeleteOutline}
                    text={$t('delete_album')}
                    onClick={() => handleDeleteAlbum(album)}
                  />
                {:else}
                  <ActionMenuItem action={Leave} />
                {/if}
              </ButtonContextMenu>
            {/if}
          </div>

          {#if album.assetCount > 0}
            <div
              class="flex shrink-0 items-center pe-2 text-xs font-medium text-gray-500 whitespace-nowrap dark:text-gray-400"
            >
              <span>{$t('items_count', { values: { count: album.assetCount } })}</span>
            </div>
          {/if}
        {:else if viewMode === AlbumPageViewMode.SELECT_ASSETS}
          <div class="flex shrink-0 items-center gap-1 [&>*]:shrink-0">
            <IconButton
              icon={mdiClose}
              shape="round"
              variant="ghost"
              color="secondary"
              aria-label={$t('close')}
              onclick={handleCloseSelectAssets}
            />

            <div class="mx-1 h-5 w-px shrink-0 bg-gray-300 dark:bg-gray-700"></div>

            <p class="shrink-0 text-sm font-semibold whitespace-nowrap dark:text-immich-dark-fg">
              {#if !timelineMultiSelectManager.selectionActive}
                {$t('add_to_album')}
              {:else}
                <span class="text-primary">
                  {$t('selected_count', { values: { count: timelineMultiSelectManager.assets.length } })}
                </span>
              {/if}
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2 [&>*]:shrink-0">
            <HeaderActionButton action={Upload} />
            <HeaderActionButton action={AddAssets} />
          </div>
        {:else if viewMode === AlbumPageViewMode.SELECT_THUMBNAIL}
          <div class="flex shrink-0 items-center gap-1 [&>*]:shrink-0">
            <IconButton
              icon={mdiClose}
              shape="round"
              variant="ghost"
              color="secondary"
              aria-label={$t('close')}
              onclick={() => (viewMode = AlbumPageViewMode.VIEW)}
            />

            <div class="mx-1 h-5 w-px shrink-0 bg-gray-300 dark:bg-gray-700"></div>

            <p class="shrink-0 text-sm font-semibold whitespace-nowrap dark:text-immich-dark-fg">
              {$t('select_album_cover')}
            </p>
          </div>
        {/if}
      </header>

      <div class="min-h-0 flex-1 w-full bg-white dark:bg-immich-dark-bg ps-2">
        <Timeline
          bind:this={timelineComponent}
          enableRouting={viewMode === AlbumPageViewMode.SELECT_ASSETS ? false : true}
          {album}
          {albumUsers}
          bind:timelineManager
          {options}
          assetInteraction={currentAssetIntersection}
          {isShared}
          {isSelectionMode}
          {singleSelect}
          {showArchiveIcon}
          showMissingGpsIcon={showMissingGps}
          onAssetGpsClick={handleAssetGpsClick}
          {onSelect}
          onEscape={handleEscape}
          withStacked={true}
          onAssetHover={(asset) => (hoveredAsset = asset)}
        >
          {#if viewMode !== AlbumPageViewMode.SELECT_ASSETS}
            {#if viewMode !== AlbumPageViewMode.SELECT_THUMBNAIL}
              <!-- ALBUM TITLE -->
              <section class="pt-8">
                <AlbumTitle
                  id={album.id}
                  albumName={album.albumName}
                  {isEditor}
                  onUpdate={(albumName) => (album = { ...album, albumName })}
                />

                {#if album.assetCount > 0}
                  <AlbumSummary {album} />
                {/if}

                <!-- ALBUM SHARING -->
                {#if album.albumUsers.length > 1 || (album.hasSharedLink && isOwned)}
                  <div class="my-3 flex gap-x-1">
                    <button
                      class="flex gap-x-1"
                      type="button"
                      onclick={() => modalManager.show(AlbumOptionsModal, { album, readOnly: !isOwned })}
                    >
                      <!-- owner & users with write access (collaborators) -->
                      {#each album.albumUsers.filter(({ role }) => role === AlbumUserRole.Editor || role === AlbumUserRole.Owner) as { user } (user.id)}
                        <UserAvatar {user} size="md" />
                      {/each}

                      <!-- display ellipsis if there are readonly users too -->
                      {#if albumHasViewers}
                        <IconButton
                          shape="round"
                          aria-label={$t('view_all_users')}
                          color="secondary"
                          size="medium"
                          icon={mdiDotsHorizontal}
                        />
                      {/if}

                      {#if album.hasSharedLink && isOwned}
                        <IconButton
                          aria-label={$t('shared_link_manage_links')}
                          color="secondary"
                          size="medium"
                          shape="round"
                          icon={mdiLink}
                        />
                      {/if}
                    </button>

                    {#if isOwned}
                      <ActionButton action={Share} />
                    {/if}
                  </div>
                {/if}
                <AlbumDescription
                  id={album.id}
                  {isEditor}
                  bind:description={() => album.description, (description) => (album = { ...album, description })}
                />
              </section>
            {/if}

            {#if album.assetCount === 0}
              <section id="empty-album" class="mt-50 flex place-content-center place-items-center">
                <div class="w-75">
                  <p class="text-xs uppercase dark:text-immich-dark-fg">{$t('add_photos')}</p>
                  <button
                    type="button"
                    onclick={() => (viewMode = AlbumPageViewMode.SELECT_ASSETS)}
                    class="mt-5 flex w-full place-items-center gap-6 rounded-2xl border bg-subtle p-8 text-immich-fg transition-all hover:bg-gray-100 hover:text-immich-primary dark:border-none dark:text-immich-dark-fg dark:hover:bg-gray-500/20 dark:hover:text-immich-dark-primary"
                  >
                    <span class="text-primary">
                      <Icon icon={mdiPlus} size="24" />
                    </span>
                    <span class="text-lg">{$t('select_photos')}</span>
                  </button>
                </div>
              </section>
            {/if}
          {/if}
        </Timeline>
      </div>
    </div>
  </div>

  {#if showActivityStatus}
    <div class="absolute inset-e-0 bottom-0 z-2 me-12 mb-6">
      <ActivityStatus
        disabled={!album.isActivityEnabled}
        isLiked={activityManager.isLiked}
        numberOfComments={activityManager.commentCount}
        numberOfLikes={undefined}
        onFavorite={handleFavorite}
      />
    </div>
  {/if}

  {#if album.albumUsers.length > 1 && album && assetViewerManager.isShowActivityPanel && authManager.authenticated && !assetViewerManager.isViewing}
    <div class="flex">
      <div
        transition:fly={{ duration: 150 }}
        id="activity-panel"
        class="z-2 w-90 overflow-y-auto transition-all md:w-115 dark:border-l dark:border-s-immich-dark-gray"
        translate="yes"
      >
        <ActivityViewer disabled={!album.isActivityEnabled} albumUsers={album.albumUsers} albumId={album.id} />
      </div>
    </div>
  {/if}
  {#if assetMultiSelectManager.selectionActive}
    <AssetSelectControlBar>
      {@const Actions = getAssetBulkActions($t, album)}
      {@const StackActions = getStackBulkActions($t)}
      <CommandPaletteDefaultProvider name={$t('assets')} actions={Object.values(Actions)} />
      <CreateSharedLink />
      <SelectAllAssets {timelineManager} assetInteraction={assetMultiSelectManager} />
      <ActionButton action={Actions.AddToAlbum} />
      {#if assetMultiSelectManager.isAllUserOwned}
        <MoveToLibraryAction
          onAssetChange={(assets, selectedLibraryId) => {
            timelineManager.update(
              assets.map((a) => a.id),
              (asset) => {
                asset.libraryId = selectedLibraryId;
              },
            );
            timelineManager.upsertAssets(assets.map((a) => toTimelineAsset(a)));
          }}
        />
        <FavoriteAction
          removeFavorite={assetMultiSelectManager.isAllFavorite}
          onFavorite={(ids, isFavorite) => timelineManager.update(ids, (asset) => (asset.isFavorite = isFavorite))}
        ></FavoriteAction>
      {/if}
      <ButtonContextMenu icon={mdiDotsVertical} title={$t('menu')} direction="up" offset={{ x: 175, y: 0 }}>
        <DownloadAction menuItem filename={album.albumName} />
        <ActionMenuItem action={StackActions.Stack} />
        <ActionMenuItem action={StackActions.Unstack} />
        {#if assetMultiSelectManager.isAllUserOwned}
          <ChangeDate menuItem />
          <ChangeDescription menuItem />
          <ChangeLocation menuItem />
          <ArchiveAction
            menuItem
            unarchive={assetMultiSelectManager.isAllArchived}
            onArchive={(ids, visibility) => timelineManager.update(ids, (asset) => (asset.visibility = visibility))}
          />
          <SetVisibilityAction menuItem onVisibilitySet={handleSetVisibility} />
        {/if}
        {#if assetMultiSelectManager.assets.length === 1}
          <MenuOption
            text={$t('set_as_album_cover')}
            icon={mdiImageOutline}
            onClick={() => updateThumbnailUsingCurrentSelection()}
          />
        {/if}

        {#if authManager.preferences.tags.enabled && assetMultiSelectManager.isAllUserOwned}
          <TagAction menuItem />
        {/if}
        <ActionMenuItem action={Actions.RemoveFromAlbum} />
        {#if assetMultiSelectManager.isAllUserOwned}
          <DeleteAssets menuItem onAssetDelete={handleRemoveAssets} onUndoDelete={handleUndoRemoveAssets} />
        {/if}
      </ButtonContextMenu>
    </AssetSelectControlBar>
  {/if}
</UserPageLayout>

<style>
  ::placeholder {
    color: rgb(60, 60, 60);
    opacity: 0.6;
  }

  ::-ms-input-placeholder {
    /* Edge 12 -18 */
    color: white;
  }
</style>
