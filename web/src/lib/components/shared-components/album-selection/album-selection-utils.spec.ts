import {
  AlbumModalRowConverter,
  AlbumModalRowType,
  type AlbumModalRow,
} from '#lib/components/shared-components/album-selection/album-selection-utils.ts';
import { factory } from '#test/unit/factories.ts';
import type { AlbumResponseDto } from '@immich/sdk';

// Some helper functions to make tests below more readable
const createNewAlbumRow = (selected: boolean) => ({
  type: AlbumModalRowType.NEW_ALBUM,
  selected,
});
const createMessageRow = (message: string): AlbumModalRow => ({
  type: AlbumModalRowType.MESSAGE,
  text: message,
});
const createSectionRow = (message: string): AlbumModalRow => ({
  type: AlbumModalRowType.SECTION,
  text: message,
});
const createAlbumRow = (album: AlbumResponseDto, selected: boolean) => ({
  type: AlbumModalRowType.ALBUM_ITEM,
  album,
  selected,
  multiSelected: false,
});

describe('Album Modal', () => {
  it('no albums configured yet shows message and new', () => {
    const converter = new AlbumModalRowConverter();
    const modalRows = converter.toModalRows('', [], -1, []);

    expect(modalRows).toStrictEqual([createNewAlbumRow(false), createMessageRow('no_albums_yet')]);
  });

  it('no matching albums shows message and new', () => {
    const converter = new AlbumModalRowConverter();
    const modalRows = converter.toModalRows('matches_nothing', [factory.album({ albumName: 'Holidays' })], -1, []);

    expect(modalRows).toStrictEqual([createNewAlbumRow(false), createMessageRow('no_albums_with_name_yet')]);
  });

  it('displays single albums', () => {
    const converter = new AlbumModalRowConverter();
    const holidayAlbum = factory.album({ albumName: 'Holidays' });
    const modalRows = converter.toModalRows('', [holidayAlbum], -1, []);

    expect(modalRows).toStrictEqual([
      createNewAlbumRow(false),
      createSectionRow('RECENT'),
      createAlbumRow(holidayAlbum, false),
    ]);
  });

  it('displays multiple albums sorted by updatedAt', () => {
    const converter = new AlbumModalRowConverter();
    const holidayAlbum = factory.album({ albumName: 'Holidays', updatedAt: '2023-01-01T00:00:00.000Z' });
    const constructionAlbum = factory.album({ albumName: 'Construction', updatedAt: '2023-04-01T00:00:00.000Z' });
    const birthdayAlbum = factory.album({ albumName: 'Birthday', updatedAt: '2023-02-01T00:00:00.000Z' });
    const christmasAlbum = factory.album({ albumName: 'Christmas', updatedAt: '2023-03-01T00:00:00.000Z' });
    const modalRows = converter.toModalRows(
      '',
      [holidayAlbum, constructionAlbum, birthdayAlbum, christmasAlbum],
      -1,
      [],
    );

    expect(modalRows).toStrictEqual([
      createNewAlbumRow(false),
      createSectionRow('RECENT'),
      createAlbumRow(constructionAlbum, false),
      createAlbumRow(christmasAlbum, false),
      createAlbumRow(birthdayAlbum, false),
      createAlbumRow(holidayAlbum, false),
    ]);
  });

  it('search changes messaging and removes non-matching albums', () => {
    const converter = new AlbumModalRowConverter();
    const holidayAlbum = factory.album({ albumName: 'Holidays' });
    const constructionAlbum = factory.album({ albumName: 'Construction' });
    const birthdayAlbum = factory.album({ albumName: 'Birthday' });
    const christmasAlbum = factory.album({ albumName: 'Christmas' });
    const modalRows = converter.toModalRows(
      'Cons',
      [holidayAlbum, constructionAlbum, birthdayAlbum, christmasAlbum],
      -1,
      [],
    );

    expect(modalRows).toStrictEqual([
      createNewAlbumRow(false),
      createSectionRow('ALBUMS'),
      createAlbumRow(constructionAlbum, false),
    ]);
  });

  it('search matches on description as well as name', () => {
    const converter = new AlbumModalRowConverter();
    const holidayAlbum = factory.album({ albumName: 'Vacances 2019', description: 'Crete' });
    const constructionAlbum = factory.album({ albumName: 'Construction' });
    const modalRows = converter.toModalRows('Crete', [holidayAlbum, constructionAlbum], -1, []);

    expect(modalRows).toStrictEqual([
      createNewAlbumRow(false),
      createSectionRow('ALBUMS'),
      createAlbumRow(holidayAlbum, false),
    ]);
  });

  it('selection can select new album row', () => {
    const converter = new AlbumModalRowConverter();
    const holidayAlbum = factory.album({ albumName: 'Holidays', updatedAt: '2023-02-01T00:00:00.000Z' });
    const constructionAlbum = factory.album({ albumName: 'Construction', updatedAt: '2023-01-01T00:00:00.000Z' });
    const modalRows = converter.toModalRows('', [holidayAlbum, constructionAlbum], 0, []);

    expect(modalRows).toStrictEqual([
      createNewAlbumRow(true),
      createSectionRow('RECENT'),
      createAlbumRow(holidayAlbum, false),
      createAlbumRow(constructionAlbum, false),
    ]);
  });

  it('selection can select recent row', () => {
    const converter = new AlbumModalRowConverter();
    const holidayAlbum = factory.album({ albumName: 'Holidays', updatedAt: '2023-02-01T00:00:00.000Z' });
    const constructionAlbum = factory.album({ albumName: 'Construction', updatedAt: '2023-01-01T00:00:00.000Z' });
    const modalRows = converter.toModalRows('', [holidayAlbum, constructionAlbum], 1, []);

    expect(modalRows).toStrictEqual([
      createNewAlbumRow(false),
      createSectionRow('RECENT'),
      createAlbumRow(holidayAlbum, true),
      createAlbumRow(constructionAlbum, false),
    ]);
  });

  it('selection can select last row', () => {
    const converter = new AlbumModalRowConverter();
    const holidayAlbum = factory.album({ albumName: 'Holidays', updatedAt: '2023-02-01T00:00:00.000Z' });
    const constructionAlbum = factory.album({ albumName: 'Construction', updatedAt: '2023-01-01T00:00:00.000Z' });
    const modalRows = converter.toModalRows('', [holidayAlbum, constructionAlbum], 2, []);

    expect(modalRows).toStrictEqual([
      createNewAlbumRow(false),
      createSectionRow('RECENT'),
      createAlbumRow(holidayAlbum, false),
      createAlbumRow(constructionAlbum, true),
    ]);
  });
});
