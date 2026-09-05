import '@testing-library/jest-dom';
import { render, waitFor, type RenderResult } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { init, register, waitLocale } from 'svelte-i18n';
import { sdkMock } from '$lib/__mocks__/sdk.mock';
import { locale } from '$lib/stores/preferences.store';
import { renderWithTooltips } from '$tests/helpers';
import { albumFactory } from '@test-data/factories/album-factory';
import AlbumCard from '../AlbumCard.svelte';

const onShowContextMenu = vi.fn();

describe('AlbumCard component', () => {
  let sut: RenderResult<typeof AlbumCard>;

  beforeAll(async () => {
    locale.set('en');
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  it.each([
    {
      album: albumFactory.build({ albumThumbnailAssetId: null, shared: false, assetCount: 0 }),
      count: 0,
      shared: false,
    },
    {
      album: albumFactory.build({ albumThumbnailAssetId: null, shared: true, assetCount: 0 }),
      count: 0,
      shared: true,
    },
    {
      album: albumFactory.build({ albumThumbnailAssetId: null, shared: false, assetCount: 5 }),
      count: 5,
      shared: false,
    },
    {
      album: albumFactory.build({ albumThumbnailAssetId: null, shared: true, assetCount: 2 }),
      count: 2,
      shared: true,
    },
  ])('shows album data without thumbnail with count $count - shared: $shared', async ({ album, count, shared }) => {
    sut = render(AlbumCard, { album, showItemCount: true });

    const albumImgElement = sut.getByTestId('album-image');
    const albumNameElement = sut.getByTestId('album-name');
    const albumDetailsElement = sut.getByTestId('album-details');
    const detailsText = `${count} items` + (shared ? ' . Shared' : '');

    expect(albumImgElement).toHaveAttribute('src');
    expect(albumImgElement).toHaveAttribute('alt', album.albumName);

    await waitFor(() => expect(albumImgElement).toHaveAttribute('src'));

    expect(albumImgElement).toHaveAttribute('alt', album.albumName);
    expect(sdkMock.viewAsset).not.toHaveBeenCalled();

    expect(albumNameElement).toHaveTextContent(album.albumName);
    expect(albumDetailsElement).toHaveTextContent(new RegExp(detailsText));
  });

  it('shows album data', () => {
    const album = albumFactory.build({
      shared: false,
      albumName: 'some album name',
    });
    sut = render(AlbumCard, { album, showItemCount: true });

    const albumImgElement = sut.getByTestId('album-image');
    const albumNameElement = sut.getByTestId('album-name');
    const albumDetailsElement = sut.getByTestId('album-details');

    expect(albumImgElement).toHaveAttribute('alt', album.albumName);
    expect(albumImgElement).toHaveAttribute('src');

    expect(albumNameElement).toHaveTextContent('some album name');
    expect(albumDetailsElement).toHaveTextContent('0 item');
  });

  it('hides context menu when "onShowContextMenu" is undefined', () => {
    const album = Object.freeze(albumFactory.build({ albumThumbnailAssetId: null }));
    sut = render(AlbumCard, { album });

    const contextButtonParent = sut.queryByTestId('context-button-parent');
    expect(contextButtonParent).not.toBeInTheDocument();
  });

  it('shows last updated line when lastModifiedAssetTimestamp is present', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const album = albumFactory.build({
      lastModifiedAssetTimestamp: twoDaysAgo,
    });
    sut = render(AlbumCard, { album });

    const lastUpdatedElement = sut.getByTestId('album-last-updated');
    expect(lastUpdatedElement).toBeInTheDocument();
    expect(lastUpdatedElement).toHaveTextContent('Last updated 2 days ago');
  });

  it('does not show last updated line when lastModifiedAssetTimestamp is undefined', () => {
    const album = albumFactory.build({
      lastModifiedAssetTimestamp: undefined,
    });
    sut = render(AlbumCard, { album });

    expect(sut.queryByTestId('album-last-updated')).not.toBeInTheDocument();
  });

  describe('with rendered component - no thumbnail', () => {
    const album = Object.freeze(albumFactory.build({ albumThumbnailAssetId: null }));

    beforeEach(async () => {
      sut = renderWithTooltips(AlbumCard, { album, onShowContextMenu });

      const albumImgElement = sut.getByTestId('album-image');
      await waitFor(() => expect(albumImgElement).toHaveAttribute('src'));
    });

    it('dispatches "onShowContextMenu" event on context menu click with mouse coordinates', async () => {
      const contextMenuButton = sut.getByTestId('context-button-parent').firstElementChild!;
      expect(contextMenuButton).toBeDefined();

      // Mock getBoundingClientRect to return a bounding rectangle that will result in the expected position
      contextMenuButton.getBoundingClientRect = () => ({
        x: 123,
        y: 456,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        toJSON: () => ({}),
      });

      const user = userEvent.setup();
      await user.click(contextMenuButton);

      expect(onShowContextMenu).toHaveBeenCalledTimes(1);
      expect(onShowContextMenu).toHaveBeenCalledWith(expect.objectContaining({ x: 123, y: 456 }));
    });
  });
});
