import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { DateTime } from 'luxon';
import { getAnimateMock } from '$lib/__mocks__/animate.mock';
import { getIntersectionObserverMock } from '$lib/__mocks__/intersection-observer.mock';
import { sdkMock } from '$lib/__mocks__/sdk.mock';
import { getVisualViewportMock } from '$lib/__mocks__/visual-viewport.mock';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { calcNewDate } from '$lib/modals/timezone-utils';
import { userAdminFactory } from '@test-data/factories/user-factory';
import AssetSelectionChangeDateModal from './AssetSelectionChangeDateModal.svelte';

describe('DateSelectionModal component', () => {
  const initialDate = DateTime.fromISO('2024-01-01');
  const initialTimeZone = 'Europe/Berlin';

  const onClose = vi.fn();

  const getRelativeInputToggle = () => screen.getByTestId('edit-by-offset-switch');
  const getDateInput = () => screen.getByLabelText('date_and_time') as HTMLInputElement;
  const getTimeZoneInput = () => screen.getByLabelText('timezone') as HTMLInputElement;
  const getCancelButton = () => screen.getByRole('button', { name: /cancel/i });
  const getConfirmButton = () => screen.getByRole('button', { name: /confirm/i });

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', getIntersectionObserverMock());
    vi.stubGlobal('visualViewport', getVisualViewportMock());
    vi.resetAllMocks();
    Element.prototype.animate = getAnimateMock();

    authManager.setUser(userAdminFactory.build());
  });

  afterAll(async () => {
    await waitFor(() => {
      // check that bits-ui body scroll-lock class is gone
      expect(document.body.style.pointerEvents).not.toBe('none');
    });
  });

  test('should render correct values', () => {
    render(AssetSelectionChangeDateModal, {
      initialDate,
      initialTimeZone,
      assets: [],

      onClose,
    });
    expect(getDateInput().value).toBe('2024-01-01T00:00');
    expect(getTimeZoneInput().value).toBe('Europe/Berlin (+01:00)');
  });

  test('renders raw time-related info table when exactly 1 asset is passed in', () => {
    const asset = {
      id: 'asset-1',
      ownerId: 'user-1',
      localDateTime: '2023-11-19T19:11:00.000Z',
      exifInfo: {
        dateTimeOriginal: '2023-11-19T18:11:00.000Z',
        timeZone: 'Europe/Berlin',
      },
    } as any;

    render(AssetSelectionChangeDateModal, {
      initialDate,
      initialTimeZone,
      assets: [asset],
      originalAssets: [asset],
      onClose,
    });

    expect(screen.getByText('EXIF OriginalDateTime')).toBeInTheDocument();
    expect(screen.getByText('2023-11-19T18:11:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('EXIF timezone')).toBeInTheDocument();
    expect(screen.getByText('Europe/Berlin')).toBeInTheDocument();
    expect(screen.getByText('Local date time')).toBeInTheDocument();
    expect(screen.getByText('2023-11-19T19:11:00.000Z')).toBeInTheDocument();
  });

  test('does not render raw info table when multiple assets are passed in', () => {
    const asset1 = { id: 'asset-1', ownerId: 'user-1' } as any;
    const asset2 = { id: 'asset-2', ownerId: 'user-1' } as any;

    render(AssetSelectionChangeDateModal, {
      initialDate,
      initialTimeZone,
      assets: [asset1, asset2],
      onClose,
    });

    expect(screen.queryByText('Original date time')).not.toBeInTheDocument();
  });

  test('toggles on showRelative initially when more than 1 asset is passed in', () => {
    const asset1 = { id: 'asset-1', ownerId: 'user-1' } as any;
    const asset2 = { id: 'asset-2', ownerId: 'user-1' } as any;

    render(AssetSelectionChangeDateModal, {
      initialDate,
      initialTimeZone,
      assets: [asset1, asset2],
      onClose,
    });

    expect(getRelativeInputToggle()).toBeChecked();
  });

  test('allows flipping the showRelative switch freely after initialization', async () => {
    const asset1 = { id: 'asset-1', ownerId: 'user-1' } as any;
    const asset2 = { id: 'asset-2', ownerId: 'user-1' } as any;

    render(AssetSelectionChangeDateModal, {
      initialDate,
      initialTimeZone,
      assets: [asset1, asset2],
      onClose,
    });

    expect(getRelativeInputToggle()).toBeChecked();

    await fireEvent.click(getRelativeInputToggle());
    expect(getRelativeInputToggle()).not.toBeChecked();

    await fireEvent.click(getRelativeInputToggle());
    expect(getRelativeInputToggle()).toBeChecked();
  });



  test('calls onConfirm with correct date on confirm', async () => {
    render(AssetSelectionChangeDateModal, {
      props: { initialDate, initialTimeZone, assets: [], onClose },
    });

    await fireEvent.click(getConfirmButton());

    expect(sdkMock.updateAssets).toHaveBeenCalledWith({
      assetBulkUpdateDto: {
        ids: [],
        dateTimeOriginal: '2024-01-01T00:00:00.000+01:00',
      },
    });
  });

  test('calls onCancel on cancel', async () => {
    render(AssetSelectionChangeDateModal, {
      props: { initialDate, initialTimeZone, assets: [], onClose },
    });

    await fireEvent.click(getCancelButton());

    expect(onClose).toHaveBeenCalled();
  });

  test('does not fall back to UTC when datetime-local value has no seconds', async () => {
    render(AssetSelectionChangeDateModal, {
      props: { initialDate, initialTimeZone, assets: [], onClose },
    });

    await fireEvent.input(getDateInput(), { target: { value: '2024-01-01T00:00' } });
    await fireEvent.blur(getDateInput());

    expect(getTimeZoneInput().value).toBe('Europe/Berlin (+01:00)');

    await fireEvent.focus(getTimeZoneInput());
    expect(screen.queryByText('no_results')).not.toBeInTheDocument();
  });

  test('does not fall back to UTC when datetime-local value has no milliseconds', async () => {
    render(AssetSelectionChangeDateModal, {
      props: { initialDate, initialTimeZone, assets: [], onClose },
    });

    await fireEvent.input(getDateInput(), { target: { value: '2024-01-01T00:00:00' } });
    await fireEvent.blur(getDateInput());

    expect(getTimeZoneInput().value).toBe('Europe/Berlin (+01:00)');

    await fireEvent.focus(getTimeZoneInput());
    expect(screen.queryByText('no_results')).not.toBeInTheDocument();
  });

  describe('when date is in daylight saving time', () => {
    const dstDate = DateTime.fromISO('2024-07-01');

    test('should render correct timezone with offset', () => {
      render(AssetSelectionChangeDateModal, {
        initialDate: dstDate,
        initialTimeZone,
        assets: [],
        onClose,
      });

      expect(getTimeZoneInput().value).toBe('Europe/Berlin (+02:00)');
    });

    test('calls onConfirm with correct date on confirm', async () => {
      render(AssetSelectionChangeDateModal, {
        props: { initialDate: dstDate, initialTimeZone, assets: [], onClose },
      });

      await fireEvent.click(getConfirmButton());

      expect(sdkMock.updateAssets).toHaveBeenCalledWith({
        assetBulkUpdateDto: {
          ids: [],
          dateTimeOriginal: '2024-07-01T00:00:00.000+02:00',
        },
      });
    });
  });

  test('calls onConfirm with correct offset in relative mode', async () => {
    render(AssetSelectionChangeDateModal, {
      props: { initialDate, initialTimeZone, assets: [], onClose },
    });

    await fireEvent.click(getRelativeInputToggle());

    const dayInput = screen.getByPlaceholderText('days');
    const hoursInput = screen.getByPlaceholderText('hours');
    const minutesInput = screen.getByPlaceholderText('minutes');

    const days = 5;
    const hours = 4;
    const minutes = 3;

    await fireEvent.input(dayInput, { target: { value: days } });
    await fireEvent.input(hoursInput, { target: { value: hours } });
    await fireEvent.input(minutesInput, { target: { value: minutes } });

    await fireEvent.click(getConfirmButton());

    expect(sdkMock.updateAssets).toHaveBeenCalledWith({
      assetBulkUpdateDto: {
        ids: [],
        dateTimeRelative: days * 60 * 24 + hours * 60 + minutes,
        timeZone: 'Europe/Berlin',
      },
    });
  });

  test('calls onConfirm with correct timeZone in relative mode', async () => {
    const user = userEvent.setup();
    render(AssetSelectionChangeDateModal, {
      props: { initialDate, initialTimeZone, assets: [], onClose },
    });

    await user.click(getRelativeInputToggle());
    await user.type(getTimeZoneInput(), initialTimeZone);
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    await user.click(getConfirmButton());

    expect(sdkMock.updateAssets).toHaveBeenCalledWith({
      assetBulkUpdateDto: {
        ids: [],
        dateTimeRelative: 0,
        timeZone: 'Europe/Berlin',
      },
    });
  });

  test('renders calculated new date time and timezone in preview table when offset changes', async () => {
    const asset = {
      id: 'asset-1',
      ownerId: 'user-1',
      originalFileName: 'test.jpg',
      localDateTime: {
        year: 2024,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone: 'Europe/Berlin',
    } as any;

    render(AssetSelectionChangeDateModal, {
      props: { initialDate, initialTimeZone, assets: [asset], onClose },
    });

    await fireEvent.click(getRelativeInputToggle());

    // Initially with 0 duration, both second and third cells show original formatted time
    expect(screen.getAllByText('01-01 12:00:00 UTC+1')).toHaveLength(2);

    const minutesInput = screen.getByPlaceholderText('minutes');
    await fireEvent.input(minutesInput, { target: { value: 30 } });

    // With 30 minutes added, the third cell updates to 12:30:00 UTC+1
    expect(screen.getByText('01-01 12:00:00 UTC+1')).toBeInTheDocument();
    expect(screen.getByText('01-01 12:30:00 UTC+1')).toBeInTheDocument();

    // When changing timezone to LA, the third cell updates to LA timezone (UTC-8)
    const laButton = screen.getByRole('button', { name: 'LA' });
    await fireEvent.click(laButton);
    expect(screen.getByText('01-01 12:30:00 UTC-8')).toBeInTheDocument();
  });



  test('correctly handles date preview', () => {
    const testCases = [
      {
        timestamp: DateTime.fromISO('2024-01-01T00:00:00.000+01:00', { setZone: true }),
        duration: 0,
        timezone: undefined,
        expectedResult: '2024-01-01T00:00:00.000',
      },
      {
        timestamp: DateTime.fromISO('2024-01-01T04:00:00.000+05:00', { setZone: true }),
        duration: 0,
        timezone: undefined,
        expectedResult: '2024-01-01T04:00:00.000',
      },
      {
        timestamp: DateTime.fromISO('2024-01-01T00:00:00.000+00:00', { setZone: true }),
        duration: 0,
        timezone: 'Europe/Berlin',
        expectedResult: '2024-01-01T01:00:00.000',
      },
      {
        timestamp: DateTime.fromISO('2024-07-01T00:00:00.000+00:00', { setZone: true }),
        duration: 0,
        timezone: 'Europe/Berlin',
        expectedResult: '2024-07-01T02:00:00.000',
      },
      {
        timestamp: DateTime.fromISO('2024-01-01T00:00:00.000+01:00', { setZone: true }),
        duration: 1440,
        timezone: undefined,
        expectedResult: '2024-01-02T00:00:00.000',
      },
      {
        timestamp: DateTime.fromISO('2024-01-01T00:00:00.000+01:00', { setZone: true }),
        duration: -1440,
        timezone: undefined,
        expectedResult: '2023-12-31T00:00:00.000',
      },
      {
        timestamp: DateTime.fromISO('2024-01-01T00:00:00.000-01:00', { setZone: true }),
        duration: -1440,
        timezone: 'America/Anchorage',
        expectedResult: '2023-12-30T16:00:00.000',
      },
    ];

    for (const testCase of testCases) {
      expect(calcNewDate(testCase.timestamp, testCase.duration, testCase.timezone), JSON.stringify(testCase)).toBe(
        testCase.expectedResult,
      );
    }
  });

  describe('timezone preset buttons', () => {
    test('renders 4 preset timezone buttons with correct labels', () => {
      render(AssetSelectionChangeDateModal, {
        initialDate,
        initialTimeZone,
        assets: [],
        onClose,
      });

      expect(screen.getByRole('button', { name: 'LA' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tokyo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Beijing' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Paris' })).toBeInTheDocument();
    });

    test('updates combobox value when clicking a preset button', async () => {
      render(AssetSelectionChangeDateModal, {
        initialDate,
        initialTimeZone: 'Europe/Berlin',
        assets: [],
        onClose,
      });

      const tokyoButton = screen.getByRole('button', { name: 'Tokyo' });
      await fireEvent.click(tokyoButton);

      expect(getTimeZoneInput().value).toContain('Asia/Chita');

      const laButton = screen.getByRole('button', { name: 'LA' });
      await fireEvent.click(laButton);

      expect(getTimeZoneInput().value).toContain('America/Los_Angeles');
    });

    test('syncs combobox selection to preset buttons', async () => {
      const user = userEvent.setup();
      render(AssetSelectionChangeDateModal, {
        initialDate,
        initialTimeZone: 'Europe/Berlin',
        assets: [],
        onClose,
      });

      const tokyoButton = screen.getByRole('button', { name: 'Tokyo' });

      // Click tokyo button
      await fireEvent.click(tokyoButton);
      expect(getTimeZoneInput().value).toContain('Asia/Chita');

      // Now select Paris via combobox
      await user.clear(getTimeZoneInput());
      await user.type(getTimeZoneInput(), 'Europe/Paris');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(getTimeZoneInput().value).toContain('Europe/Paris');
    });
  });
});
