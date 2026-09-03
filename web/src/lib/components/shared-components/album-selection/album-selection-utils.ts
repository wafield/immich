import type { AlbumResponseDto } from '@immich/sdk';
import { t } from 'svelte-i18n';
import { get } from 'svelte/store';
import { AlbumSortBy, SortOrder } from '$lib/stores/preferences.store';
import { sortAlbums } from '$lib/utils/album-utils';
import { normalizeSearchString } from '$lib/utils/string-utils';

export const SCROLL_PROPERTIES: ScrollIntoViewOptions = { block: 'center', behavior: 'smooth' };

export enum AlbumModalRowType {
  SECTION = 'section',
  MESSAGE = 'message',
  NEW_ALBUM = 'newAlbum',
  ALBUM_ITEM = 'albumItem',
}

export type AlbumModalRow = {
  type: AlbumModalRowType;
  selected?: boolean;
  multiSelected?: boolean;
  text?: string;
  album?: AlbumResponseDto;
};

export const isSelectableRowType = (type: AlbumModalRowType) =>
  type === AlbumModalRowType.NEW_ALBUM || type === AlbumModalRowType.ALBUM_ITEM;

const $t = get(t);

export class AlbumModalRowConverter {
  private readonly sortBy: string;
  private readonly orderBy: string;

  constructor(sortBy: string = AlbumSortBy.DateModified, orderBy: string = SortOrder.Desc) {
    this.sortBy = sortBy;
    this.orderBy = orderBy;
  }

  toModalRows(
    search: string,
    albums: AlbumResponseDto[],
    selectedRowIndex: number,
    multiSelectedAlbumIds: string[],
  ): AlbumModalRow[] {
    const rows: AlbumModalRow[] = [{ type: AlbumModalRowType.NEW_ALBUM, selected: selectedRowIndex === 0 }];

    const normalizedSearch = normalizeSearchString(search);
    const filteredAlbums = sortAlbums(
      search.length > 0 && albums.length > 0
        ? albums.filter((album) => {
            return (
              normalizeSearchString(album.albumName).includes(normalizedSearch) ||
              normalizeSearchString(album.description).includes(normalizedSearch)
            );
          })
        : albums,
      { sortBy: this.sortBy, orderBy: this.orderBy },
    );

    if (filteredAlbums.length > 0) {
      rows.push({
        type: AlbumModalRowType.SECTION,
        text: (search.length === 0 ? $t('recent') : $t('albums')).toUpperCase(),
      });

      const selectedOffsetDueToNewAlbumRow = 1;
      for (const [i, album] of filteredAlbums.entries()) {
        rows.push({
          type: AlbumModalRowType.ALBUM_ITEM,
          selected: selectedRowIndex === i + selectedOffsetDueToNewAlbumRow,
          multiSelected: multiSelectedAlbumIds.includes(album.id),
          album,
        });
      }
    } else if (albums.length > 0) {
      rows.push({ type: AlbumModalRowType.MESSAGE, text: $t('no_albums_with_name_yet') });
    } else {
      rows.push({ type: AlbumModalRowType.MESSAGE, text: $t('no_albums_yet') });
    }
    return rows;
  }
}
