import { AssetOrder, AssetOrderBy } from '@immich/sdk';
import { fromISODateTimeUTCToObject } from '$lib/utils/timeline-util';
import { timelineAssetFactory } from '@test-data/factories/asset-factory';
import { TimelineDay } from './timeline-day.svelte';
import type { TimelineMonth } from './timeline-month.svelte';
import { ViewerAsset } from './viewer-asset.svelte';

describe('TimelineDay', () => {
  const dummyMonth = {} as TimelineMonth;

  describe('sortAssets', () => {
    describe('when orderBy is TakenAt (default timeline)', () => {
      it('should sort assets by localDateTime descending, even if fileCreatedAt is in opposite order', () => {
        const day = new TimelineDay(dummyMonth, 0, 15, 'Jan 15, 2024', AssetOrderBy.TakenAt);

        // assetEarlierLocal has earlier local time (09:00), but later fileCreatedAt (13:00 UTC)
        const assetEarlierLocal = timelineAssetFactory.build({
          id: 'asset-1',
          localDateTime: fromISODateTimeUTCToObject('2024-01-15T09:00:00.000Z'),
          fileCreatedAt: fromISODateTimeUTCToObject('2024-01-15T13:00:00.000Z'),
        });

        // assetLaterLocal has later local time (11:00), but earlier fileCreatedAt (10:00 UTC)
        const assetLaterLocal = timelineAssetFactory.build({
          id: 'asset-2',
          localDateTime: fromISODateTimeUTCToObject('2024-01-15T11:00:00.000Z'),
          fileCreatedAt: fromISODateTimeUTCToObject('2024-01-15T10:00:00.000Z'),
        });

        day.viewerAssets = [new ViewerAsset(assetEarlierLocal), new ViewerAsset(assetLaterLocal)];

        day.sortAssets(AssetOrder.Desc);

        expect(day.viewerAssets.map((v) => v.asset.id)).toEqual(['asset-2', 'asset-1']);
      });

      it('should sort assets by localDateTime ascending when AssetOrder.Asc is passed', () => {
        const day = new TimelineDay(dummyMonth, 0, 15, 'Jan 15, 2024', AssetOrderBy.TakenAt);

        const assetEarlierLocal = timelineAssetFactory.build({
          id: 'asset-1',
          localDateTime: fromISODateTimeUTCToObject('2024-01-15T09:00:00.000Z'),
          fileCreatedAt: fromISODateTimeUTCToObject('2024-01-15T13:00:00.000Z'),
        });

        const assetLaterLocal = timelineAssetFactory.build({
          id: 'asset-2',
          localDateTime: fromISODateTimeUTCToObject('2024-01-15T11:00:00.000Z'),
          fileCreatedAt: fromISODateTimeUTCToObject('2024-01-15T10:00:00.000Z'),
        });

        day.viewerAssets = [new ViewerAsset(assetLaterLocal), new ViewerAsset(assetEarlierLocal)];

        day.sortAssets(AssetOrder.Asc);

        expect(day.viewerAssets.map((v) => v.asset.id)).toEqual(['asset-1', 'asset-2']);
      });
    });
  });
});
