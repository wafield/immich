import { describe, expect, it, vi } from 'vitest';
import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
import { RowSize, ROW_SIZE_LAYOUT_OPTIONS } from '$lib/stores/preferences.store';

describe('preferences.store ROW_SIZE_LAYOUT_OPTIONS', () => {
  it('returns large layout options when viewport is large or above', () => {
    vi.spyOn(mediaQueryManager, 'isLarge', 'get').mockReturnValue(true);

    expect(ROW_SIZE_LAYOUT_OPTIONS[RowSize.S]).toEqual({
      rowHeight: 150,
      headerHeight: 32,
      gap: 2,
    });
    expect(ROW_SIZE_LAYOUT_OPTIONS[RowSize.M]).toEqual({
      rowHeight: 240,
      headerHeight: 48,
      gap: 3,
    });
    expect(ROW_SIZE_LAYOUT_OPTIONS[RowSize.L]).toEqual({
      rowHeight: 320,
      headerHeight: 60,
      gap: 4,
    });
  });

  it('returns smaller device-dependent layout options when viewport is below large', () => {
    vi.spyOn(mediaQueryManager, 'isLarge', 'get').mockReturnValue(false);

    expect(ROW_SIZE_LAYOUT_OPTIONS[RowSize.S]).toEqual({
      rowHeight: 80,
      headerHeight: 32,
      gap: 2,
    });
    expect(ROW_SIZE_LAYOUT_OPTIONS[RowSize.M]).toEqual({
      rowHeight: 150,
      headerHeight: 48,
      gap: 3,
    });
    expect(ROW_SIZE_LAYOUT_OPTIONS[RowSize.L]).toEqual({
      rowHeight: 210,
      headerHeight: 60,
      gap: 4,
    });
  });
});
