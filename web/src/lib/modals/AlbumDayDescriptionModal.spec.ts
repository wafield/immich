import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AlbumDayDescriptionModal from './AlbumDayDescriptionModal.svelte';

describe('AlbumDayDescriptionModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial description and dateTitle', async () => {
    const screen = await render(AlbumDayDescriptionModal, {
      date: '2026-10-04',
      dateTitle: 'Sunday, Oct 4, 2026',
      initialDescription: 'Day 1 in Paris',
      onClose,
    });

    await expect.element(screen.getByText('Sunday, Oct 4, 2026')).toBeInTheDocument();
    const textarea = screen.getByRole('textbox').element() as HTMLTextAreaElement;
    expect(textarea.value).toBe('Day 1 in Paris');
  });

  it('submits updated description', async () => {
    const screen = await render(AlbumDayDescriptionModal, {
      date: '2026-10-04',
      dateTitle: 'Sunday, Oct 4, 2026',
      initialDescription: 'Day 1 in Paris',
      onClose,
    });

    const textarea = screen.getByRole('textbox');
    await userEvent.fill(textarea, 'Updated description');

    const submitBtn = screen.getByRole('button', { name: /save|submit|confirm/i });
    await userEvent.click(submitBtn);

    expect(onClose).toHaveBeenCalledWith('Updated description');
  });

  it('submits empty string when cleared', async () => {
    const screen = await render(AlbumDayDescriptionModal, {
      date: '2026-10-04',
      dateTitle: 'Sunday, Oct 4, 2026',
      initialDescription: 'Old description',
      onClose,
    });

    const textarea = screen.getByRole('textbox');
    await userEvent.fill(textarea, '');

    const submitBtn = screen.getByRole('button', { name: /save|submit|confirm/i });
    await userEvent.click(submitBtn);

    expect(onClose).toHaveBeenCalledWith('');
  });
});
