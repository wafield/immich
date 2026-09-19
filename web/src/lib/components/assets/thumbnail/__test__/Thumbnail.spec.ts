import { render } from '@testing-library/svelte';
import { getIntersectionObserverMock } from '$lib/__mocks__/intersection-observer.mock';
import Thumbnail from '$lib/components/assets/thumbnail/Thumbnail.svelte';
import { highlightMissingGps, highlightMissingTimezone } from '$lib/stores/preferences.store';
import { getTabbable } from '$lib/utils/focus-util';
import { assetFactory } from '@test-data/factories/asset-factory';

vi.mock('$lib/utils/navigation', () => ({
  currentUrlReplaceAssetId: vi.fn(),
  isSharedLinkRoute: vi.fn().mockReturnValue(false),
}));

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    enumerable: true,
    value: vi.fn().mockImplementation(function (query) {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
});

describe('Thumbnail component', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', getIntersectionObserverMock());
  });

  afterEach(() => {
    highlightMissingTimezone.set(false);
    highlightMissingGps.set(false);
  });

  it('should only contain a single tabbable element (the container)', () => {
    const asset = assetFactory.build({ originalPath: 'image.jpg', originalMimeType: 'image/jpeg' });
    const { baseElement } = render(Thumbnail, {
      asset,
      selected: true,
    });

    const container = baseElement.querySelector('[data-thumbnail-focus-container]');
    expect(container).not.toBeNull();
    expect(container!.getAttribute('tabindex')).toBe('0');

    // Guarding against inserting extra tabbable elements in future in <Thumbnail/>
    const tabbables = getTabbable(container!);
    expect(tabbables.length).toBe(0);
  });

  it('shows thumbhash while image is loading', () => {
    const asset = assetFactory.build({ originalPath: 'image.jpg', originalMimeType: 'image/jpeg' });
    const sut = render(Thumbnail, {
      asset,
      selected: true,
    });

    const thumbhash = sut.getByTestId('thumbhash');
    expect(thumbhash).not.toBeFalsy();
  });

  it('renders missing timezone icon when highlightMissingTimezone is true and timezone is missing', () => {
    highlightMissingTimezone.set(true);
    const asset = assetFactory.build({ originalPath: 'image.jpg', originalMimeType: 'image/jpeg', timeZone: null });
    const { baseElement } = render(Thumbnail, {
      asset,
    });

    const icon = baseElement.querySelector('[data-icon-missing-timezone]');
    expect(icon).not.toBeNull();
  });

  it('does not render missing timezone icon when asset has timezone', () => {
    highlightMissingTimezone.set(true);
    const asset = assetFactory.build({
      originalPath: 'image.jpg',
      originalMimeType: 'image/jpeg',
      timeZone: 'America/New_York',
    });
    const { baseElement } = render(Thumbnail, {
      asset,
    });

    const icon = baseElement.querySelector('[data-icon-missing-timezone]');
    expect(icon).toBeNull();
  });

  it('does not render missing timezone icon when highlightMissingTimezone is false', () => {
    highlightMissingTimezone.set(false);
    const asset = assetFactory.build({ originalPath: 'image.jpg', originalMimeType: 'image/jpeg', timeZone: null });
    const { baseElement } = render(Thumbnail, {
      asset,
    });

    const icon = baseElement.querySelector('[data-icon-missing-timezone]');
    expect(icon).toBeNull();
  });

  it('renders missing GPS icon when showMissingGpsIcon is true and GPS is missing', () => {
    const asset = assetFactory.build({
      originalPath: 'image.jpg',
      originalMimeType: 'image/jpeg',
      latitude: null,
      longitude: null,
    });
    const { baseElement } = render(Thumbnail, {
      asset,
      showMissingGpsIcon: true,
    });

    const icon = baseElement.querySelector('[data-icon-missing-gps]');
    expect(icon).not.toBeNull();
  });

  it('renders missing GPS icon when highlightMissingGps store is true and GPS is missing', () => {
    highlightMissingGps.set(true);
    const asset = assetFactory.build({
      originalPath: 'image.jpg',
      originalMimeType: 'image/jpeg',
      latitude: null,
      longitude: null,
    });
    const { baseElement } = render(Thumbnail, {
      asset,
    });

    const icon = baseElement.querySelector('[data-icon-missing-gps]');
    expect(icon).not.toBeNull();
  });

  it('does not render missing GPS icon when asset has GPS data', () => {
    const asset = assetFactory.build({
      originalPath: 'image.jpg',
      originalMimeType: 'image/jpeg',
      latitude: 40.7128,
      longitude: -74.006,
    });
    const { baseElement } = render(Thumbnail, {
      asset,
      showMissingGpsIcon: true,
    });

    const icon = baseElement.querySelector('[data-icon-missing-gps]');
    expect(icon).toBeNull();
  });

  it('does not render missing GPS icon when showMissingGpsIcon and highlightMissingGps are false', () => {
    const asset = assetFactory.build({
      originalPath: 'image.jpg',
      originalMimeType: 'image/jpeg',
      latitude: null,
      longitude: null,
    });
    const { baseElement } = render(Thumbnail, {
      asset,
      showMissingGpsIcon: false,
    });

    const icon = baseElement.querySelector('[data-icon-missing-gps]');
    expect(icon).toBeNull();
  });

  it('calls onClick and prevents default when space bar is pressed on focused thumbnail', () => {
    const asset = assetFactory.build({ originalPath: 'image.jpg', originalMimeType: 'image/jpeg' });
    const onClick = vi.fn();
    const { baseElement } = render(Thumbnail, {
      asset,
      onClick,
    });

    const container = baseElement.querySelector('[data-thumbnail-focus-container]') as HTMLElement;
    expect(container).not.toBeNull();

    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    const notPrevented = container.dispatchEvent(event);

    expect(notPrevented).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: asset.id }));
  });

  it('calls onClick and prevents default when Enter is pressed on focused thumbnail', () => {
    const asset = assetFactory.build({ originalPath: 'image.jpg', originalMimeType: 'image/jpeg' });
    const onClick = vi.fn();
    const { baseElement } = render(Thumbnail, {
      asset,
      onClick,
    });

    const container = baseElement.querySelector('[data-thumbnail-focus-container]') as HTMLElement;
    expect(container).not.toBeNull();

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    const notPrevented = container.dispatchEvent(event);

    expect(notPrevented).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: asset.id }));
  });
});
