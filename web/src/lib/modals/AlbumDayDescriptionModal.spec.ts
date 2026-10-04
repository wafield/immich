import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AlbumDayDescriptionModal from './AlbumDayDescriptionModal.svelte';

describe('AlbumDayDescriptionModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial description and dateTitle', () => {
    render(AlbumDayDescriptionModal, {
      date: '2026-10-04',
      dateTitle: 'Sunday, Oct 4, 2026',
      initialDescription: 'Day 1 in Paris',
      onClose,
    });

    expect(screen.getByText('Sunday, Oct 4, 2026')).toBeInTheDocument();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Day 1 in Paris');
  });

  it('submits updated description', async () => {
    render(AlbumDayDescriptionModal, {
      date: '2026-10-04',
      dateTitle: 'Sunday, Oct 4, 2026',
      initialDescription: 'Day 1 in Paris',
      onClose,
    });

    const textarea = screen.getByRole('textbox');
    await fireEvent.input(textarea, { target: { value: 'Updated description' } });

    const submitBtn = screen.getByRole('button', { name: /save|submit|confirm/i });
    await fireEvent.click(submitBtn);

    expect(onClose).toHaveBeenCalledWith('Updated description');
  });

  it('submits empty string when cleared', async () => {
    render(AlbumDayDescriptionModal, {
      date: '2026-10-04',
      dateTitle: 'Sunday, Oct 4, 2026',
      initialDescription: 'Old description',
      onClose,
    });

    const textarea = screen.getByRole('textbox');
    await fireEvent.input(textarea, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /save|submit|confirm/i });
    await fireEvent.click(submitBtn);

    expect(onClose).toHaveBeenCalledWith('');
  });
});
