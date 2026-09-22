import { fireEvent, render } from '@testing-library/svelte';
import { languageManager } from '$lib/managers/language-manager.svelte';
import PanelResizeHandle from './PanelResizeHandle.svelte';

describe('PanelResizeHandle', () => {
  let mockContainer: HTMLDivElement;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockContainer.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      right: 1000,
      width: 1000,
      top: 0,
      bottom: 800,
      height: 800,
    });
    vi.spyOn(languageManager, 'rtl', 'get').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with accessibility slider attributes', () => {
    const onResize = vi.fn();
    const { getByRole } = render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      minWidth: 280,
      ariaLabel: 'Resize details panel',
      onResize,
    });

    const slider = getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', '360');
    expect(slider).toHaveAttribute('aria-valuemin', '280');
    expect(slider).toHaveAttribute('aria-label', 'Resize details panel');
    expect(slider).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('resizes on pointer down and pointer move in LTR', async () => {
    const onResize = vi.fn();
    const onDraggingChange = vi.fn();
    const { getByRole } = render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      minWidth: 280,
      onResize,
      onDraggingChange,
    });

    const slider = getByRole('slider');
    slider.setPointerCapture = vi.fn();
    slider.releasePointerCapture = vi.fn();

    // Mouse button 0 pointer down at x = 640 (width was 1000 - 640 = 360)
    await fireEvent.pointerDown(slider, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 640 });
    expect(onDraggingChange).toHaveBeenCalledWith(true);
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    // Drag to the left: clientX = 500 (new width should be 1000 - 500 = 500)
    await fireEvent.pointerMove(slider, { pointerId: 1, pointerType: 'mouse', clientX: 500 });
    expect(onResize).toHaveBeenCalledWith(500);

    // Pointer up stops dragging
    await fireEvent.pointerUp(slider, { pointerId: 1 });
    expect(onDraggingChange).toHaveBeenCalledWith(false);
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('resizes on pointer move in RTL', async () => {
    vi.spyOn(languageManager, 'rtl', 'get').mockReturnValue(true);
    const onResize = vi.fn();
    const { getByRole } = render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      minWidth: 280,
      onResize,
    });

    const slider = getByRole('slider');
    slider.setPointerCapture = vi.fn();
    slider.releasePointerCapture = vi.fn();

    await fireEvent.pointerDown(slider, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 360 });

    // In RTL, width is clientX - left (rect.left = 0)
    // Moving to clientX = 450 should increase width to 450
    await fireEvent.pointerMove(slider, { pointerId: 1, pointerType: 'mouse', clientX: 450 });
    expect(onResize).toHaveBeenCalledWith(450);

    await fireEvent.pointerUp(slider, { pointerId: 1 });
  });

  it('clamps to minWidth when dragged below minimum', async () => {
    const onResize = vi.fn();
    const { getByRole } = render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      minWidth: 280,
      onResize,
    });

    const slider = getByRole('slider');
    slider.setPointerCapture = vi.fn();

    await fireEvent.pointerDown(slider, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 640 });
    // Drag to clientX = 900 -> raw width = 1000 - 900 = 100, which is below minWidth 280
    await fireEvent.pointerMove(slider, { pointerId: 1, pointerType: 'mouse', clientX: 900 });
    expect(onResize).toHaveBeenCalledWith(280);
  });

  it('handles keyboard navigation with arrows, Home, and End', async () => {
    const onResize = vi.fn();
    const { getByRole } = render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      minWidth: 280,
      onResize,
    });

    const slider = getByRole('slider');

    // ArrowLeft in LTR widens the panel
    await fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onResize).toHaveBeenCalledWith(380);

    // ArrowRight in LTR shrinks the panel
    await fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onResize).toHaveBeenCalledWith(340);

    // Home jumps to minWidth
    await fireEvent.keyDown(slider, { key: 'Home' });
    expect(onResize).toHaveBeenCalledWith(280);

    // End jumps to maxWidth (container width 1000 - 250 = 750)
    await fireEvent.keyDown(slider, { key: 'End' });
    expect(onResize).toHaveBeenCalledWith(750);
  });

  it('ignores non-primary mouse buttons on pointer down', async () => {
    const onResize = vi.fn();
    const onDraggingChange = vi.fn();
    const { getByRole } = render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      onResize,
      onDraggingChange,
    });

    const slider = getByRole('slider');
    await fireEvent.pointerDown(slider, { pointerId: 1, pointerType: 'mouse', button: 2, clientX: 640 });
    expect(onDraggingChange).not.toHaveBeenCalled();
  });
});
