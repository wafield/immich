import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/svelte';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { assetFactory } from '@test-data/factories/asset-factory';
import { preferencesFactory } from '@test-data/factories/preferences-factory';
import { userAdminFactory } from '@test-data/factories/user-factory';
import { Modal, isModalOpen } from '@immich/ui';
import { updateAsset } from '@immich/sdk';
import { DateTime } from 'luxon';
import { getAnimateMock } from '$lib/__mocks__/animate.mock';
import { getIntersectionObserverMock } from '$lib/__mocks__/intersection-observer.mock';
import { getVisualViewportMock } from '$lib/__mocks__/visual-viewport.mock';
import AssetSelectionChangeDateModal from '$lib/modals/AssetSelectionChangeDateModal.svelte';
import RatingAction from './RatingAction.svelte';

vi.mock('@immich/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@immich/sdk')>();
  return {
    ...actual,
    updateAsset: vi.fn(),
  };
});

describe('RatingAction component', () => {
  const onAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authManager.setUser(userAdminFactory.build());
    authManager.setPreferences(
      preferencesFactory.build({
        ratings: { enabled: true },
      }),
    );
  });

  afterEach(() => {
    authManager.reset();
  });

  it('rates the asset when a number key is pressed and no modal is open', async () => {
    const asset = assetFactory.build({ id: 'test-asset-1' });
    render(RatingAction, { asset, onAction });

    expect(isModalOpen()).toBe(false);

    await fireEvent.keyDown(document, { key: '4' });

    expect(updateAsset).toHaveBeenCalledWith({
      id: 'test-asset-1',
      updateAssetDto: { rating: 4 },
    });
  });

  it('does not rate the asset when a modal is open', async () => {
    const asset = assetFactory.build({ id: 'test-asset-1' });
    render(RatingAction, { asset, onAction });

    expect(isModalOpen()).toBe(false);

    const modal = render(Modal, { title: 'Test Modal', children: (() => {}) as never });
    expect(isModalOpen()).toBe(true);

    await fireEvent.keyDown(document, { key: '3' });

    expect(updateAsset).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();

    modal.unmount();
    expect(isModalOpen()).toBe(false);

    await fireEvent.keyDown(document, { key: '3' });

    expect(updateAsset).toHaveBeenCalledWith({
      id: 'test-asset-1',
      updateAssetDto: { rating: 3 },
    });
  });

  it('does not rate the asset when AssetSelectionChangeDateModal is open', async () => {
    vi.stubGlobal('IntersectionObserver', getIntersectionObserverMock());
    vi.stubGlobal('visualViewport', getVisualViewportMock());
    Element.prototype.animate = getAnimateMock();

    const asset = assetFactory.build({ id: 'test-asset-1' });
    render(RatingAction, { asset, onAction });

    expect(isModalOpen()).toBe(false);

    const modal = render(AssetSelectionChangeDateModal, {
      initialDate: DateTime.fromISO('2024-01-01T12:00:00'),
      initialTimeZone: 'UTC',
      assets: [],
      onClose: vi.fn(),
    });

    expect(isModalOpen()).toBe(true);

    await fireEvent.keyDown(document, { key: '5' });

    expect(updateAsset).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();

    modal.unmount();
    expect(isModalOpen()).toBe(false);

    await fireEvent.keyDown(document, { key: '5' });

    expect(updateAsset).toHaveBeenCalledWith({
      id: 'test-asset-1',
      updateAssetDto: { rating: 5 },
    });
  });

  it('allows number keys to be used in AssetSelectionChangeDateModal inputs without preventDefault or rating', async () => {
    vi.stubGlobal('IntersectionObserver', getIntersectionObserverMock());
    vi.stubGlobal('visualViewport', getVisualViewportMock());
    Element.prototype.animate = getAnimateMock();

    const asset = assetFactory.build({ id: 'test-asset-1' });
    render(RatingAction, { asset, onAction });

    const modal = render(AssetSelectionChangeDateModal, {
      initialDate: DateTime.fromISO('2024-01-01T12:00:00'),
      initialTimeZone: 'UTC',
      assets: [],
      onClose: vi.fn(),
    });

    const dateInput = modal.getByLabelText('date_and_time') as HTMLInputElement;
    dateInput.focus();

    const event = new KeyboardEvent('keydown', { key: '3', cancelable: true, bubbles: true });
    const notPrevented = dateInput.dispatchEvent(event);

    expect(notPrevented).toBe(true);
    expect(event.defaultPrevented).toBe(false);
    expect(updateAsset).not.toHaveBeenCalled();

    modal.unmount();
  });
});
