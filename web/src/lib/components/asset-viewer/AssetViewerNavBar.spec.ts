import '@testing-library/jest-dom';
import { getResizeObserverMock } from '$lib/__mocks__/resize-observer.mock';
import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { renderWithTooltips } from '$tests/helpers';
import { assetFactory } from '@test-data/factories/asset-factory';
import { preferencesFactory } from '@test-data/factories/preferences-factory';
import { userAdminFactory } from '@test-data/factories/user-factory';
import { AssetTypeEnum } from '@immich/sdk';
import AssetViewerNavBar from './AssetViewerNavBar.svelte';

vi.mock(import('$lib/managers/feature-flags-manager.svelte'), function () {
  return {
    featureFlagsManager: {
      init: vi.fn(),
      loadFeatureFlags: vi.fn(),
      value: { smartSearch: true, trash: true },
    } as never,
  };
});

describe('AssetViewerNavBar component', () => {
  const additionalProps = {
    preAction: () => {},
    onAction: () => {},
    onPlaySlideshow: () => {},
    onClose: () => {},
    playOriginalVideo: false,
    setPlayOriginalVideo: () => Promise.resolve(),
  };

  beforeAll(() => {
    Element.prototype.animate = vi.fn().mockImplementation(function () {
      return {
        cancel: () => {},
      };
    });
    vi.stubGlobal('ResizeObserver', getResizeObserverMock());
  });

  afterEach(() => {
    authManager.reset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('shows back button', () => {
    const preferences = preferencesFactory.build({ cast: { gCastEnabled: false } });
    authManager.setPreferences(preferences);

    const asset = assetFactory.build({ isTrashed: false });
    const { getByLabelText } = renderWithTooltips(AssetViewerNavBar, { asset, ...additionalProps });
    expect(getByLabelText('go_back')).toBeInTheDocument();
  });

  describe('if the current user owns the asset', () => {
    it('shows delete button', () => {
      const ownerId = 'id-of-the-user';
      const user = userAdminFactory.build({ id: ownerId });
      const asset = assetFactory.build({ ownerId, isTrashed: false });
      authManager.setUser(user);

      const preferences = preferencesFactory.build({ cast: { gCastEnabled: false } });
      authManager.setPreferences(preferences);

      const { getByLabelText } = renderWithTooltips(AssetViewerNavBar, { asset, ...additionalProps });
      expect(getByLabelText('delete')).toBeInTheDocument();
    });
  });

  describe('zoom level percentage display', () => {
    afterEach(() => {
      assetViewerManager.resetZoomState();
      assetViewerManager.imageLoaderStatus = undefined;
    });

    it('does not display zoom percentage if viewerKind is not PhotoViewer', () => {
      const asset = assetFactory.build({ type: AssetTypeEnum.Video });
      assetViewerManager.imageLoaderStatus = {
        started: true,
        hasError: false,
        urls: { thumbnail: 'thumb.jpg', preview: 'prev.jpg', original: 'orig.jpg' },
        quality: { thumbnail: 'success', preview: 'success', original: 'success' },
      };

      const { queryByTestId } = renderWithTooltips(AssetViewerNavBar, {
        asset,
        viewerKind: 'VideoViewer',
        ...additionalProps,
      });

      expect(queryByTestId('asset-viewer-navbar-zoom-level')).not.toBeInTheDocument();
    });

    it('does not display zoom percentage if the asset is in thumbnail version (preview not loaded)', () => {
      const asset = assetFactory.build({ type: AssetTypeEnum.Image });
      assetViewerManager.imageLoaderStatus = {
        started: true,
        hasError: false,
        urls: { thumbnail: 'thumb.jpg', preview: undefined, original: undefined },
        quality: { thumbnail: 'success', preview: 'unloaded', original: 'unloaded' },
      };

      const { queryByTestId } = renderWithTooltips(AssetViewerNavBar, {
        asset,
        viewerKind: 'PhotoViewer',
        ...additionalProps,
      });

      expect(queryByTestId('asset-viewer-navbar-zoom-level')).not.toBeInTheDocument();
    });

    it('does not display zoom percentage if only preview version is displayed (original not loaded)', () => {
      const asset = assetFactory.build({ type: AssetTypeEnum.Image });
      assetViewerManager.resetZoomState();
      assetViewerManager.imageLoaderStatus = {
        started: true,
        hasError: false,
        urls: { thumbnail: 'thumb.jpg', preview: 'prev.jpg', original: undefined },
        quality: { thumbnail: 'success', preview: 'success', original: 'unloaded' },
      };

      const { queryByTestId } = renderWithTooltips(AssetViewerNavBar, {
        asset,
        viewerKind: 'PhotoViewer',
        ...additionalProps,
      });

      expect(queryByTestId('asset-viewer-navbar-zoom-level')).not.toBeInTheDocument();
    });

    it('displays 100% zoom percentage when photo asset is in original version at 1:1 zoom level', () => {
      const asset = assetFactory.build({ type: AssetTypeEnum.Image });
      assetViewerManager.resetZoomState();
      assetViewerManager.imageLoaderStatus = {
        started: true,
        hasError: false,
        urls: { thumbnail: 'thumb.jpg', preview: 'prev.jpg', original: 'orig.jpg' },
        quality: { thumbnail: 'success', preview: 'success', original: 'success' },
      };

      const { getByTestId } = renderWithTooltips(AssetViewerNavBar, {
        asset,
        viewerKind: 'PhotoViewer',
        ...additionalProps,
      });

      const zoomElement = getByTestId('asset-viewer-navbar-zoom-level');
      expect(zoomElement).toBeInTheDocument();
      expect(zoomElement).toHaveTextContent('100%');
    });

    it('displays updated percentage when zoom in level changes', () => {
      const asset = assetFactory.build({ type: AssetTypeEnum.Image });
      assetViewerManager.zoom = 2;
      assetViewerManager.imageLoaderStatus = {
        started: true,
        hasError: false,
        urls: { thumbnail: 'thumb.jpg', preview: 'prev.jpg', original: 'orig.jpg' },
        quality: { thumbnail: 'success', preview: 'success', original: 'success' },
      };

      const { getByTestId } = renderWithTooltips(AssetViewerNavBar, {
        asset,
        viewerKind: 'PhotoViewer',
        ...additionalProps,
      });

      const zoomElement = getByTestId('asset-viewer-navbar-zoom-level');
      expect(zoomElement).toBeInTheDocument();
      expect(zoomElement).toHaveTextContent('200%');
    });
  });
});
