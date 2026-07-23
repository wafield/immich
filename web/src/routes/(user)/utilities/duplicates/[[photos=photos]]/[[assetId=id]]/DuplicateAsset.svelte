<script lang="ts">
  import { lang, locale } from '$lib/stores/preferences.store';
  import { getAssetMediaUrl } from '$lib/utils';
  import { getAltText } from '$lib/utils/thumbnail-util';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { getLibrary, AssetMediaSize, getAllAlbums, type AssetResponseDto } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import {
    mdiBookmarkOutline,
    mdiHeart,
    mdiImageMultipleOutline,
    mdiMagnifyPlus,
    mdiDatabase,
    mdiClockOutline,
    mdiCalendar,
  } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { getAllMetadataItems, formatISODateToLocale, type DifferingMetadataFields } from '$lib/utils/duplicate-utils';
  import InfoRow from './InfoRow.svelte';

  interface Props {
    asset: AssetResponseDto;
    isSelected: boolean;
    onSelectAsset: (asset: AssetResponseDto) => void;
    onViewAsset: (asset: AssetResponseDto) => void;
    differingMetadataFields: DifferingMetadataFields;
    showMore?: boolean;
    initialVisibleCount?: number;
    imageSize?: 'S' | 'M' | 'L';
  }

  let {
    asset,
    isSelected,
    onSelectAsset,
    onViewAsset,
    differingMetadataFields = {},
    showMore = false,
    initialVisibleCount = 5,
    imageSize = 'M',
  }: Props = $props();

  const imageSizeClass = $derived(imageSize === 'S' ? 'h-60' : imageSize === 'L' ? 'h-full' : 'h-120');

  const listFormat = $derived(new Intl.ListFormat($lang));
  const isFromExternalLibrary = $derived(!!asset.libraryId);

  const visibleMetadataItems = $derived(
    getAllMetadataItems(asset, $t, $locale)
      .filter(({ keys }) => keys.some((k) => differingMetadataFields[k]))
      .filter(
        ({ keys }) =>
          !keys.some((k) =>
            ['originalFileName', 'libraryId', 'createdAt', 'dateTimeOriginal', 'localDateTime'].includes(k),
          ),
      )
      .slice(0, showMore ? undefined : initialVisibleCount),
  );
</script>

<div class="min-w-60 flex-1 rounded-lg border transition-colors">
  <div class="relative w-full">
    <button
      type="button"
      onclick={() => onSelectAsset(asset)}
      class="relative block w-full"
      aria-pressed={isSelected}
      aria-label={$t('keep')}
    >
      <!-- THUMBNAIL-->
      <img
        src={getAssetMediaUrl({ id: asset.id, size: AssetMediaSize.Preview })}
        alt={$getAltText(toTimelineAsset(asset))}
        class="{imageSizeClass} w-full rounded-t-md object-contain"
        draggable="false"
      />

      <!-- FAVORITE ICON -->
      {#if asset.isFavorite}
        <div class="absolute inset-s-2 bottom-2">
          <Icon icon={mdiHeart} size="24" class="text-white" />
        </div>
      {/if}

      <!-- OVERLAY CHIP -->
      <div
        class="absolute inset-e-3 bottom-1 rounded-xl px-4 py-1 text-xs transition-colors {isSelected
          ? 'bg-green-400/90'
          : 'bg-red-300/90'} text-black"
      >
        {isSelected ? $t('keep') : $t('to_trash')}
      </div>

      <!-- EXTERNAL LIBRARY / STACK COUNT CHIP -->
      <div class="absolute inset-e-3 top-2">
        {#if isFromExternalLibrary}
          <div class="rounded-xl bg-immich-primary/90 px-2 py-1 text-xs text-white">
            {$t('external')}
          </div>
        {/if}
        {#if asset.stack?.assetCount}
          <div class="my-0.5 rounded-xl bg-immich-primary/90 px-2 py-1 text-xs text-white">
            <div class="flex items-center justify-center">
              <div class="me-1">{asset.stack.assetCount}</div>
              <Icon icon={mdiImageMultipleOutline} size="18" />
            </div>
          </div>
        {/if}
      </div>
    </button>

    <button
      type="button"
      onclick={() => onViewAsset(asset)}
      class="absolute inset-s-1 top-1 rounded-full bg-black/35 p-2 text-gray-200 hover:bg-black/50 hover:text-white"
      title={$t('view')}
    >
      <Icon aria-label={$t('view')} icon={mdiMagnifyPlus} flipped size="18" />
    </button>
  </div>

  <div
    class="grid place-items-start gap-y-2 rounded-b-lg py-2 text-sm transition-colors {isSelected
      ? 'bg-success/15 dark:bg-[#001a06]'
      : 'bg-transparent'}"
  >
    <!-- Library name the asset belongs to -->
    <InfoRow icon={mdiDatabase} title={$t('library', { default: 'Library' })}>
      {#if asset.libraryId}
        {#await getLibrary({ id: asset.libraryId })}
          Loading...
        {:then library}
          {library.name}
        {:catch}
          Default Library
        {/await}
      {:else}
        Default Library
      {/if}
    </InfoRow>

    <!-- Date and time at which it was added to the database -->
    <InfoRow icon={mdiClockOutline} title="Added to database">
      {formatISODateToLocale(asset.createdAt, $locale)}
    </InfoRow>

    {#each visibleMetadataItems as { icon, title, render, keys } (keys[0])}
      <InfoRow {icon} {title}>
        {render}
      </InfoRow>
    {/each}

    <!-- Albums always shown -->
    <InfoRow icon={mdiBookmarkOutline} borderBottom={false} title={$t('albums')}>
      {#await getAllAlbums({ assetId: asset.id })}
        {$t('scanning_for_album')}
      {:then albums}
        {#if albums.length === 1}
          {albums[0].albumName}
        {:else}
          <span title={listFormat.format(albums.map(({ albumName }) => albumName))}>
            {$t('in_albums', { values: { count: albums.length } })}
          </span>
        {/if}
      {/await}
    </InfoRow>
  </div>
</div>
