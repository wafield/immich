import { languageManager } from '#lib/managers/language-manager.svelte.ts';
import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
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

  it('renders with accessibility slider attributes', async () => {
    const onResize = vi.fn();
    const screen = await render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      minWidth: 280,
      ariaLabel: 'Resize details panel',
      onResize,
    });

    const slider = screen.getByRole('slider');
    await expect.element(slider).toBeInTheDocument();
    await expect.element(slider).toHaveAttribute('aria-valuenow', '360');
    await expect.element(slider).toHaveAttribute('aria-valuemin', '280');
    await expect.element(slider).toHaveAttribute('aria-label', 'Resize details panel');
    await expect.element(slider).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('resizes on pointer down and pointer move in LTR', async () => {
    const onResize = vi.fn();
    const onDraggingChange = vi.fn();
    const screen = await render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      minWidth: 280,
      onResize,
      onDraggingChange,
    });

    const slider = screen.getByRole('slider').element() as HTMLElement;
    slider.setPointerCapture = vi.fn();
    slider.releasePointerCapture = vi.fn();

    slider.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', button: 0, clientX: 640 }),
    );
    expect(onDraggingChange).toHaveBeenCalledWith(true);
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    slider.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientX: 500 }),
    );
    expect(onResize).toHaveBeenCalledWith(500);

    slider.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    expect(onDraggingChange).toHaveBeenCalledWith(false);
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('resizes on pointer move in RTL', async () => {
    vi.spyOn(languageManager, 'rtl', 'get').mockReturnValue(true);
    const onResize = vi.fn();
    const screen = await render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      minWidth: 280,
      onResize,
    });

    const slider = screen.getByRole('slider').element() as HTMLElement;
    slider.setPointerCapture = vi.fn();
    slider.releasePointerCapture = vi.fn();

    slider.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', button: 0, clientX: 360 }),
    );

    slider.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientX: 450 }),
    );
    expect(onResize).toHaveBeenCalledWith(450);

    slider.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  });

  it('clamps to minWidth when dragged below minimum', async () => {
    const onResize = vi.fn();
    const screen = await render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      minWidth: 280,
      onResize,
    });

    const slider = screen.getByRole('slider').element() as HTMLElement;
    slider.setPointerCapture = vi.fn();

    slider.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', button: 0, clientX: 640 }),
    );
    slider.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientX: 900 }),
    );
    expect(onResize).toHaveBeenCalledWith(280);
  });

  it('handles keyboard navigation with arrows, Home, and End', async () => {
    const onResize = vi.fn();
    const screen = await render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      minWidth: 280,
      onResize,
    });

    const slider = screen.getByRole('slider').element() as HTMLElement;

    slider.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
    expect(onResize).toHaveBeenCalledWith(380);

    slider.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
    expect(onResize).toHaveBeenCalledWith(340);

    slider.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
    expect(onResize).toHaveBeenCalledWith(280);

    slider.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }));
    expect(onResize).toHaveBeenCalledWith(750);
  });

  it('ignores non-primary mouse buttons on pointer down', async () => {
    const onResize = vi.fn();
    const onDraggingChange = vi.fn();
    const screen = await render(PanelResizeHandle, {
      containerElement: mockContainer,
      panelWidth: 360,
      onResize,
      onDraggingChange,
    });

    const slider = screen.getByRole('slider').element() as HTMLElement;
    slider.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', button: 2, clientX: 640 }),
    );
    expect(onDraggingChange).not.toHaveBeenCalled();
  });
});
