import '@testing-library/jest-dom';
import { fireEvent } from '@testing-library/svelte';
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

    it('displays 50% zoom percentage when 6000x4000 image is fit to 3000x2000 container at 1x zoom', () => {
      const asset = assetFactory.build({ type: AssetTypeEnum.Image, width: 6000, height: 4000 });
      assetViewerManager.resetZoomState();
      assetViewerManager.containerSize = { width: 3000, height: 2000 };
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
      expect(zoomElement).toHaveTextContent('50%');
    });

    it('displays 100% zoom percentage when photo asset reaches 1:1 zoom level (e.g. 2x zoom on 50% fit)', () => {
      const asset = assetFactory.build({ type: AssetTypeEnum.Image, width: 6000, height: 4000 });
      assetViewerManager.resetZoomState();
      assetViewerManager.zoom = 2;
      assetViewerManager.containerSize = { width: 3000, height: 2000 };
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
      const asset = assetFactory.build({ type: AssetTypeEnum.Image, width: 4000, height: 2000 });
      assetViewerManager.zoom = 1.5;
      assetViewerManager.containerSize = { width: 4000, height: 2000 };
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
      expect(zoomElement).toHaveTextContent('150%');
    });

    it('zooms to 1x (initial fit) when scale to fit button is clicked', async () => {
      const animatedZoomSpy = vi.spyOn(assetViewerManager, 'animatedZoom');
      const asset = assetFactory.build({ type: AssetTypeEnum.Image, width: 6000, height: 4000 });
      assetViewerManager.zoom = 2;
      assetViewerManager.containerSize = { width: 3000, height: 2000 };
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

      const fitButton = getByTestId('asset-viewer-navbar-scale-to-fit');
      expect(fitButton).toBeInTheDocument();
      await fireEvent.click(fitButton);

      expect(animatedZoomSpy).toHaveBeenCalledWith(1);
      animatedZoomSpy.mockRestore();
    });

    it('zooms to 100% when scale to 100% button is clicked', async () => {
      const animatedZoomSpy = vi.spyOn(assetViewerManager, 'animatedZoom');
      const asset = assetFactory.build({ type: AssetTypeEnum.Image, width: 6000, height: 4000 });
      assetViewerManager.zoom = 1;
      assetViewerManager.containerSize = { width: 3000, height: 2000 };
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

      const scale100Button = getByTestId('asset-viewer-navbar-scale-to-100');
      expect(scale100Button).toBeInTheDocument();
      await fireEvent.click(scale100Button);

      // 6000x4000 in 3000x2000 container has 0.5 scale factor, so 100% is 1 / 0.5 = 2x zoom
      expect(animatedZoomSpy).toHaveBeenCalledWith(2);
      animatedZoomSpy.mockRestore();
    });
  });
});
