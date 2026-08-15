<script lang="ts">
  import { AssetInfoDisplay, AssetInfoBarHeight } from '$lib/constants';
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import type { ViewerAsset } from '$lib/managers/timeline-manager/viewer-asset.svelte';
  import type { VirtualScrollManager } from '$lib/managers/VirtualScrollManager/VirtualScrollManager.svelte';
  import { uploadAssetsStore } from '$lib/stores/upload';
  import type { CommonPosition } from '$lib/utils/layout-utils';
  import { fromISODateTime, fromISODateTimeUTC, fromTimelinePlainDateTime } from '$lib/utils/timeline-util';
  import { Icon } from '@immich/ui';
  import { mdiCamera, mdiCalendar } from '@mdi/js';
  import { DateTime } from 'luxon';
  import type { Snippet } from 'svelte';
  import { flip } from 'svelte/animate';
  import { scale } from 'svelte/transition';

  let { isUploading } = uploadAssetsStore;

  type Props = {
    viewerAssets: ViewerAsset[];
    width: number;
    height: number;
    manager: VirtualScrollManager;
    thumbnail: Snippet<
      [
        {
          asset: TimelineAsset;
          position: CommonPosition;
        },
      ]
    >;
    customThumbnailLayout?: Snippet<[asset: TimelineAsset]>;
    assetInfoDisplay?: AssetInfoDisplay;
  };

  const {
    viewerAssets,
    width,
    height,
    manager,
    thumbnail,
    customThumbnailLayout,
    assetInfoDisplay = AssetInfoDisplay.NONE,
  }: Props = $props();

  const transitionDuration = $derived(manager.suspendTransitions && !$isUploading ? 0 : 150);
  const scaleDuration = $derived(transitionDuration === 0 ? 0 : transitionDuration + 100);

  const formatDateTime = (asset: TimelineAsset): string => {
    try {
      const timeZone = asset.timeZone ?? undefined;
      let dt: DateTime | null = null;
      if (timeZone && asset.dateTimeOriginal) {
        dt =
          typeof asset.dateTimeOriginal === 'string'
            ? fromISODateTime(asset.dateTimeOriginal, timeZone)
            : fromTimelinePlainDateTime(asset.dateTimeOriginal).setZone(timeZone);
      } else if (asset.localDateTime) {
        dt =
          typeof asset.localDateTime === 'string'
            ? fromISODateTimeUTC(asset.localDateTime)
            : fromTimelinePlainDateTime(asset.localDateTime);
      }
      if (dt && dt.isValid) {
        return dt.toFormat('HH:mm:ss');
      }
    } catch {
      return '';
    }
    return '';
  };
</script>

<!-- Image grid -->
<div data-image-grid class="relative overflow-clip" style:height={height + 'px'} style:width={width + 'px'}>
  {#each viewerAssets as viewerAsset (viewerAsset.id)}
    {@const position = viewerAsset.position!}
    {@const asset = viewerAsset.asset!}

    <!-- note: don't remove data-asset-id - its used by web e2e tests -->
    <div
      data-asset-id={asset.id}
      class="absolute"
      style:top={position.top + 'px'}
      style:inset-inline-start={position.left + 'px'}
      style:width={position.width + 'px'}
      style:height={position.height + 'px'}
      out:scale|global={{ start: 0.1, duration: scaleDuration }}
      animate:flip={{ duration: transitionDuration }}
    >
      {@render thumbnail({ asset, position })}
      {@render customThumbnailLayout?.(asset)}
      {#if assetInfoDisplay === AssetInfoDisplay.FILE_NAME}
        <div
          class="absolute top-full w-full overflow-clip bg-slate-100 p-1 text-center font-mono text-xs dark:bg-slate-800"
          style:height="{AssetInfoBarHeight}px"
        >
          {asset.originalFileName ?? ''}
        </div>
      {:else if assetInfoDisplay === AssetInfoDisplay.FILE_NAME_CAMERA_DATE_TIME}
        {@const formattedTime = formatDateTime(asset)}
        <div
          class="absolute top-full flex w-full flex-col justify-center overflow-clip bg-slate-100 p-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          style:height="{AssetInfoBarHeight}px"
        >
          <div class="truncate text-center">
            {asset.originalFileName ?? ''}
          </div>
          <div class="flex items-center justify-between gap-1 text-slate-600 dark:text-slate-400">
            <div class="flex min-w-0 items-center gap-1 truncate">
              {#if asset.model}
                <Icon icon={mdiCamera} size="12" class="shrink-0" />
                <span class="truncate">{asset.model}</span>
              {/if}
            </div>
            <div class="flex shrink-0 items-center gap-1">
              {#if formattedTime}
                <Icon icon={mdiCalendar} size="12" class="shrink-0" />
                <span class="whitespace-nowrap">{formattedTime}</span>
              {/if}
            </div>
          </div>
        </div>
      {:else if assetInfoDisplay === AssetInfoDisplay.DESCRIPTION}
        <div
          class="absolute top-full w-full overflow-clip bg-slate-100 p-1 text-center font-mono text-xs dark:bg-slate-800"
          style:height="{AssetInfoBarHeight}px"
        >
          {asset.description ?? ''}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  [data-image-grid] {
    user-select: none;
  }
</style>
