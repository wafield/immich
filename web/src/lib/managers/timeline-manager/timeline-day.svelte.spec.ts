import { fromISODateTimeUTCToObject } from '#lib/utils/timeline-util.ts';
import { factory } from '#test/unit/factories.ts';
import { AssetOrder, AssetOrderBy } from '@immich/sdk';
import { TimelineDay } from './timeline-day.svelte.ts';
import type { TimelineMonth } from './timeline-month.svelte.ts';
import { ViewerAsset } from './viewer-asset.svelte.ts';

describe('TimelineDay', () => {
  const dummyMonth = {} as TimelineMonth;

  describe('sortAssets', () => {
    describe('when orderBy is TakenAt (default timeline)', () => {
      it('should sort assets by localDateTime descending, even if fileCreatedAt is in opposite order', () => {
        const day = new TimelineDay(dummyMonth, 0, 15, 'Jan 15, 2024', AssetOrderBy.TakenAt);

        const assetEarlierLocal = factory.timelineAsset({
          id: 'asset-1',
          localDateTime: fromISODateTimeUTCToObject('2024-01-15T09:00:00.000Z'),
          fileCreatedAt: fromISODateTimeUTCToObject('2024-01-15T13:00:00.000Z'),
        });

        const assetLaterLocal = factory.timelineAsset({
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

        const assetEarlierLocal = factory.timelineAsset({
          id: 'asset-1',
          localDateTime: fromISODateTimeUTCToObject('2024-01-15T09:00:00.000Z'),
          fileCreatedAt: fromISODateTimeUTCToObject('2024-01-15T13:00:00.000Z'),
        });

        const assetLaterLocal = factory.timelineAsset({
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
