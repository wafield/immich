<script lang="ts" module>
  import { addProtocol, setWorkerUrl } from 'maplibre-gl';
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import { Protocol } from 'pmtiles';
  import { googleProtocol } from './engine';

  let protocol = new Protocol();
  setWorkerUrl(workerUrl);
  void addProtocol('pmtiles', protocol.tile);
  void addProtocol('google', googleProtocol);
</script>

<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import OnEvents from '$lib/components/OnEvents.svelte';
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { serverConfigManager } from '$lib/managers/server-config-manager.svelte';
  import MapSettingsModal from '$lib/modals/MapSettingsModal.svelte';
  import { mapSettings } from '$lib/stores/preferences.store';
  import { getAssetMediaUrl, handlePromiseError, isValidLatLng, isValidMapHash } from '$lib/utils';
  import { getMapMarkers, type MapMarkerResponseDto } from '@immich/sdk';
  import { Alert, Container, Icon, modalManager, Text, Theme, themeManager } from '@immich/ui';
  import {
    mdiCog,
    mdiCrosshairsGps,
    mdiFitToScreenOutline,
    mdiImageMultiple,
    mdiMap,
    mdiMapMarker,
    mdiThemeLightDark,
  } from '@mdi/js';
  import type { Feature, GeoJsonProperties, Geometry, Point } from 'geojson';
  import { isEqual, omit } from 'lodash-es';
  import { DateTime, Duration } from 'luxon';
  import {
    LngLat,
    LngLatBounds,
    Marker,
    type GeoJSONSource,
    type LngLatLike,
    type Map,
    type MapMouseEvent,
  } from 'maplibre-gl';
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import { t } from 'svelte-i18n';
  import {
    AttributionControl,
    Control,
    ControlButton,
    ControlGroup,
    GeoJSON,
    GeolocateControl,
    MapLibre,
    MarkerLayer,
    NavigationControl,
    Popup,
    ScaleControl,
  } from 'svelte-maplibre';
  import type { SelectionBBox } from './types';

  export interface HoverCoordinate {
    latitude?: number | null;
    longitude?: number | null;
    lat?: number | null;
    lng?: number | null;
  }

  interface Props {
    mapMarkers?: MapMarkerResponseDto[];
    showSettings?: boolean;
    zoom?: number | undefined;
    center?: LngLatLike | undefined;
    hash?: boolean;
    simplified?: boolean;
    clickable?: boolean;
    useLocationPin?: boolean;
    onOpenInMapView?: (() => Promise<void> | void) | undefined;
    onSelect?: (assetIds: string[]) => void;
    onClusterSelect?: (assetIds: string[], bbox: SelectionBBox) => void;
    onViewportClose?: () => void;
    viewportGridActive?: boolean;
    autoOpenPanel?: boolean;
    onClickPoint?: ({ lat, lng }: { lat: number; lng: number }) => void;
    popup?: import('svelte').Snippet<[{ marker: MapMarkerResponseDto }]>;
    rounded?: boolean;
    showSimpleControls?: boolean;
    autoFitBounds?: boolean;
    hoverCoordinate?: HoverCoordinate | null;
    showCenterPin?: boolean;
    onCenterChange?: (coords: { lat: number; lng: number }) => void;
  }

  let {
    mapMarkers = $bindable(),
    showSettings = true,
    zoom = undefined,
    center = $bindable(undefined),
    hash = false,
    simplified = false,
    clickable = false,
    useLocationPin = false,
    onOpenInMapView = undefined,
    onSelect = () => {},
    onClusterSelect,
    onViewportClose,
    viewportGridActive = false,
    autoOpenPanel = false,
    onClickPoint = () => {},
    popup,
    rounded = true,
    showSimpleControls = true,
    autoFitBounds = true,
    hoverCoordinate = null,
    showCenterPin = false,
    onCenterChange = undefined,
  }: Props = $props();

  function getMarkersBounds() {
    if (!mapMarkers || mapMarkers.length === 0) {
      return undefined;
    }

    const bounds = new LngLatBounds();
    for (const marker of mapMarkers) {
      bounds.extend([marker.lon, marker.lat]);
    }
    return bounds;
  }

  // Calculate initial bounds from markers once during initialization
  const initialBounds = (() => {
    if (
      !autoFitBounds ||
      center ||
      zoom !== undefined ||
      (hash && typeof location !== 'undefined' && isValidMapHash(location.hash))
    ) {
      return undefined;
    }

    return getMarkersBounds();
  })();

  export function resetMapViewport() {
    if (!map) {
      return;
    }

    const bounds = getMarkersBounds();
    if (!bounds) {
      return;
    }

    map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
  }

  export function easeTo(target: { lat: number; lng: number }, zoom = 13) {
    if (!map || !isValidLatLng(target.lat, target.lng)) {
      return;
    }

    map.easeTo({
      center: [target.lng, target.lat],
      zoom: Math.max(map.getZoom(), zoom),
    });
  }

  let map: Map | undefined = $state();
  let marker: Marker | null = null;
  let hoverMarker: Marker | null = null;
  let abortController: AbortController;

  /**
   * Place an icon on the map where the user is hovering over an asset with a coordinate.
   */
  function updateHoverMarker() {
    if (!map) {
      return;
    }

    const lat = hoverCoordinate?.latitude ?? hoverCoordinate?.lat;
    const lng = hoverCoordinate?.longitude ?? hoverCoordinate?.lng;

    if (!isValidLatLng(lat, lng)) {
      if (hoverMarker) {
        hoverMarker.remove();
        hoverMarker = null;
      }
      return;
    }

    const bounds = map.getBounds();
    if (!bounds) {
      if (hoverMarker) {
        hoverMarker.remove();
        hoverMarker = null;
      }
      return;
    }

    const west = bounds.getWest();
    const east = bounds.getEast();
    const showAll = east - west >= 360;
    const inBounds = showAll ? lat >= bounds.getSouth() && lat <= bounds.getNorth() : bounds.contains([lng, lat]);

    if (!inBounds) {
      if (hoverMarker) {
        hoverMarker.remove();
        hoverMarker = null;
      }
      return;
    }

    if (hoverMarker) {
      hoverMarker.setLngLat([lng, lat]);
    } else {
      const el = document.createElement('div');
      el.className = 'pointer-events-none z-30 flex items-center justify-center text-red-500';
      el.innerHTML = `<svg viewBox="0 0 24 24" width="36" height="36" style="color: #ef4444; filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.6)); display: block;"><path fill="currentColor" d="${mdiCrosshairsGps}" /></svg>`;
      hoverMarker = new Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map);
    }
  }

  $effect(() => {
    void hoverCoordinate;
    void map;
    updateHoverMarker();
  });

  $effect(() => {
    if (!showCenterPin || !map || !onCenterChange) {
      return;
    }
    const c = map.getCenter();
    onCenterChange({ lat: c.lat, lng: c.lng });
  });

  let isDarkStyle = $state(($mapSettings.allowDarkMode ? themeManager.value : Theme.Light) === Theme.Dark);
  const styleUrl = $derived(
    isDarkStyle ? serverConfigManager.value.mapDarkStyleUrl : serverConfigManager.value.mapLightStyleUrl,
  );

  export function addClipMapMarker(lng: number, lat: number) {
    if (!map) {
      return;
    }

    if (marker) {
      marker.remove();
    }

    center = { lng, lat };
    marker = new Marker().setLngLat([lng, lat]).addTo(map);
  }

  function handleAssetClick(assetId: string, map: Map | null) {
    if (!map) {
      return;
    }
    onSelect([assetId]);
  }

  async function handleClusterClick(clusterId: number, map: Map | null) {
    if (!map) {
      return;
    }

    const mapSource = map.getSource('geojson') as GeoJSONSource;
    const leaves = await mapSource.getClusterLeaves(clusterId, 10_000, 0);
    const ids = leaves.map((leaf) => leaf.properties?.id as string);

    if (onClusterSelect && ids.length > 1) {
      const [firstLongitude, firstLatitude] = (leaves[0].geometry as Point).coordinates;
      let west = firstLongitude;
      let south = firstLatitude;
      let east = firstLongitude;
      let north = firstLatitude;

      for (const leaf of leaves.slice(1)) {
        const [longitude, latitude] = (leaf.geometry as Point).coordinates;
        west = Math.min(west, longitude);
        south = Math.min(south, latitude);
        east = Math.max(east, longitude);
        north = Math.max(north, latitude);
      }

      const bbox = { west, south, east, north };
      onClusterSelect(ids, bbox);
      return;
    }

    onSelect(ids);
  }

  function handleMapClick(event: MapMouseEvent) {
    if (showCenterPin && map) {
      map.easeTo({ center: event.lngLat });
    }

    if (!clickable) {
      return;
    }

    const { lng, lat } = event.lngLat;
    onClickPoint({ lng, lat });

    if (marker) {
      marker.remove();
    }

    if (map) {
      marker = new Marker().setLngLat([lng, lat]).addTo(map);
    }
  }

  type FeaturePoint = Feature<Point, { id: string; city: string | null; state: string | null; country: string | null }>;

  const asFeature = (marker: MapMarkerResponseDto): FeaturePoint => {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [marker.lon, marker.lat] },
      properties: {
        id: marker.id,
        city: marker.city,
        state: marker.state,
        country: marker.country,
      },
    };
  };

  const asMarker = (feature: Feature<Geometry, GeoJsonProperties>): MapMarkerResponseDto => {
    const featurePoint = feature as FeaturePoint;
    const coords = LngLat.convert(featurePoint.geometry.coordinates as [number, number]);
    return {
      lat: coords.lat,
      lon: coords.lng,
      id: featurePoint.properties.id,
      city: featurePoint.properties.city,
      state: featurePoint.properties.state,
      country: featurePoint.properties.country,
    };
  };

  function getFileCreatedDates() {
    const { relativeDate, dateAfter, dateBefore } = $mapSettings;

    if (relativeDate) {
      const duration = Duration.fromISO(relativeDate);
      return {
        fileCreatedAfter: duration.isValid ? DateTime.now().minus(duration).toUTC().toISO() : undefined,
      };
    }

    return {
      // $mapSettings stores no value as an empty string
      fileCreatedAfter: dateAfter || undefined,
      fileCreatedBefore: dateBefore || undefined,
    };
  }

  async function loadMapMarkers() {
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    const { includeArchived, onlyFavorites, withPartners, withSharedAlbums } = $mapSettings;
    const { fileCreatedAfter, fileCreatedBefore } = getFileCreatedDates();

    return await getMapMarkers(
      {
        isArchived: includeArchived || undefined,
        isFavorite: onlyFavorites || undefined,
        fileCreatedAfter,
        fileCreatedBefore,
        withPartners: withPartners || undefined,
        withSharedAlbums: withSharedAlbums || undefined,
      },
      {
        signal: abortController.signal,
      },
    );
  }

  const handleSettingsClick = async () => {
    const settings = await modalManager.show(MapSettingsModal);
    if (settings) {
      const shouldUpdate = !isEqual(omit(settings, 'allowDarkMode'), omit($mapSettings, 'allowDarkMode'));
      $mapSettings = settings;

      if (shouldUpdate) {
        mapMarkers = await loadMapMarkers();
      }
    }
  };

  afterNavigate(() => {
    if (!map) {
      return;
    }

    map.resize();

    if (location.hash) {
      const hashChangeEvent = new HashChangeEvent('hashchange');
      // eslint-disable-next-line unicorn/no-unnecessary-global-this
      globalThis.dispatchEvent(hashChangeEvent);
    }
  });

  onMount(async () => {
    if (!mapMarkers) {
      mapMarkers = await loadMapMarkers();
    }
    if (autoOpenPanel) {
      // Wait for the map to finish rendering before opening the panel
      await tick();
      if (map) {
        map.resize();
        await map.once('idle');
        handleViewportSelect();
      }
    }
  });

  onDestroy(() => {
    abortController?.abort();
    if (hoverMarker) {
      hoverMarker.remove();
      hoverMarker = null;
    }
  });

  $effect(() => {
    map?.setStyle(styleUrl, {
      transformStyle: (previousStyle, nextStyle) => {
        if (previousStyle) {
          // Preserves the custom map markers from the previous style when the theme is switched
          // Required until https://github.com/dimfeld/svelte-maplibre/issues/146 is fixed
          const customLayers = previousStyle.layers.filter((l) => l.type === 'fill' && l.source === 'geojson');
          const layers = nextStyle.layers.concat(customLayers);
          const sources = nextStyle.sources;

          for (const [key, value] of Object.entries(previousStyle.sources || {})) {
            if (key.startsWith('geojson')) {
              sources[key] = value;
            }
          }

          return {
            ...nextStyle,
            sources,
            layers,
          };
        }
        return nextStyle;
      },
    });
  });

  $effect(() => {
    if (!center || !zoom) {
      return;
    }

    untrack(() => map?.jumpTo({ center, zoom }));
  });

  const handleViewportSelect = () => {
    if (!map || !onClusterSelect || !mapMarkers) {
      return;
    }
    const bounds = map.getBounds();
    const west = bounds.getWest();
    const east = bounds.getEast();

    // When zoomed out enough to see the whole world, show all markers
    const showAll = east - west >= 360;
    const visibleIds = showAll
      ? mapMarkers.map(({ id }) => id)
      : mapMarkers.filter(({ lon, lat }) => bounds.contains([lon, lat])).map(({ id }) => id);

    const bbox: SelectionBBox = {
      west: showAll ? -180 : west,
      south: showAll ? -90 : bounds.getSouth(),
      east: showAll ? 180 : east,
      north: showAll ? 90 : bounds.getNorth(),
    };
    onClusterSelect(visibleIds, bbox);
  };

  const handleMoveEnd = () => {
    if (viewportGridActive && !assetViewerManager.isViewing) {
      handleViewportSelect();
    }
  };

  const onAssetsChanged = async () => {
    mapMarkers = await loadMapMarkers();
  };
  function handleMapMove() {
    updateHoverMarker();
    if (showCenterPin && map && onCenterChange) {
      const c = map.getCenter();
      onCenterChange({ lat: c.lat, lng: c.lng });
    }
  }
</script>

<OnEvents onAssetsDelete={onAssetsChanged} onAssetsArchive={onAssetsChanged} onAssetsUnarchive={onAssetsChanged} />
<svelte:boundary>
  <!--  We handle style loading ourselves so we set style blank here -->
  <MapLibre
    {hash}
    style=""
    class="h-full {rounded ? 'rounded-lg' : 'rounded-none'}"
    {zoom}
    {center}
    bounds={initialBounds}
    fitBoundsOptions={{ padding: 50, maxZoom: 15 }}
    attributionControl={false}
    diffStyleUpdates={true}
    onload={(event: Map) => {
      event.setMaxZoom(18);
      event.on('click', handleMapClick);
      event.on('moveend', handleMoveEnd);
      event.on('move', handleMapMove);
      if (hash && typeof location !== 'undefined' && !location.hash) {
        event.once('idle', () => {
          if (!location.hash) {
            event.fire('moveend');
          }
        });
      }
      // if (!simplified) {
      //   event.addControl(new GlobeControl(), 'top-left');
      // }
    }}
    bind:map
  >
    {#snippet children({ map }: { map: Map })}
      {#if showCenterPin}
        <div class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div class="relative flex flex-col items-center">
            <div class="-translate-y-1/2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
              <Icon icon={mdiMapMarker} size="48px" class="text-primary" />
            </div>
            <div
              class="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary shadow-sm ring-2 ring-white"
            ></div>
          </div>
        </div>
      {/if}
      {#if showSimpleControls}
        <NavigationControl position="top-left" showCompass={false} />

        <Control position="top-left">
          <ControlGroup>
            <ControlButton onclick={() => (isDarkStyle = !isDarkStyle)}>
              <Icon title="Toggle style" icon={mdiThemeLightDark} size="100%" class="text-black/80" />
            </ControlButton>
          </ControlGroup>
        </Control>

        {#if mapMarkers && mapMarkers.length > 0}
          <Control position="top-left">
            <ControlGroup>
              <ControlButton onclick={resetMapViewport}>
                <Icon title="Reset map viewport" icon={mdiFitToScreenOutline} size="70%" class="text-black/80" />
              </ControlButton>
            </ControlGroup>
          </Control>
        {/if}

        {#if !simplified}
          <GeolocateControl position="top-left" />
          {#if onClusterSelect}
            <Control position="top-left">
              <ControlGroup>
                <ControlButton onclick={() => (viewportGridActive ? onViewportClose?.() : handleViewportSelect())}>
                  <Icon title={$t('show_photos_in_area')} icon={mdiImageMultiple} size="70%" class="text-black/80" />
                </ControlButton>
              </ControlGroup>
            </Control>
          {/if}
          <ScaleControl />
          <AttributionControl compact={false} />
        {/if}
      {/if}

      {#if showSettings}
        <Control>
          <ControlGroup>
            <ControlButton onclick={handleSettingsClick}>
              <Icon icon={mdiCog} size="70%" class="text-black/80" />
            </ControlButton>
          </ControlGroup>
        </Control>
      {/if}

      {#if onOpenInMapView && showSimpleControls}
        <Control position="top-right">
          <ControlGroup>
            <ControlButton onclick={() => onOpenInMapView()}>
              <Icon title={$t('open_in_map_view')} icon={mdiMap} size="100%" class="text-black/80" />
            </ControlButton>
          </ControlGroup>
        </Control>
      {/if}

      <GeoJSON
        data={{
          type: 'FeatureCollection',
          features: mapMarkers?.map((marker) => asFeature(marker)) ?? [],
        }}
        id="geojson"
        cluster={{ radius: 35, maxZoom: 18 }}
      >
        <MarkerLayer
          applyToClusters
          asButton
          onclick={(event) => handlePromiseError(handleClusterClick(event.feature.properties?.cluster_id, map))}
        >
          {#snippet children({ feature })}
            <div
              class="flex size-10 items-center justify-center rounded-full bg-immich-primary font-mono font-bold text-white opacity-90 shadow-lg transition-all duration-200 hover:bg-immich-dark-primary hover:text-immich-dark-bg"
            >
              {feature.properties?.point_count?.toLocaleString()}
            </div>
          {/snippet}
        </MarkerLayer>
        <MarkerLayer
          applyToClusters={false}
          asButton
          onclick={(event) => {
            if (!popup) {
              handleAssetClick(event.feature.properties?.id, map);
            }
          }}
        >
          {#snippet children({ feature }: { feature: Feature })}
            {#if useLocationPin}
              <Icon icon={mdiMapMarker} size="50px" class="translate-y-[calc(5px-50%)] text-primary" />
            {:else}
              <img
                src={getAssetMediaUrl({ id: feature.properties?.id })}
                class="size-15 rounded-full border-2 border-immich-primary bg-immich-primary object-cover shadow-lg transition-all duration-200 hover:scale-150 hover:border-immich-dark-primary"
                alt={feature.properties?.city && feature.properties.country
                  ? $t('map_marker_for_image', {
                      values: { city: feature.properties.city, country: feature.properties.country },
                    })
                  : $t('map_marker_with_image')}
              />
            {/if}
            {#if popup}
              <Popup offset={[0, -30]} openOn="click" closeOnClickOutside>
                {@render popup({ marker: asMarker(feature) })}
              </Popup>
            {/if}
          {/snippet}
        </MarkerLayer>
      </GeoJSON>
    {/snippet}
  </MapLibre>

  {#snippet failed()}
    <Container size="small" class="p-2">
      <Alert color="warning" title={$t('errors.unable_to_load_map')} size={simplified ? 'medium' : 'large'}>
        <Text size={simplified ? 'small' : 'medium'}>{$t('errors.unable_to_load_map_description')}</Text>
      </Alert>
    </Container>
  {/snippet}
</svelte:boundary>
