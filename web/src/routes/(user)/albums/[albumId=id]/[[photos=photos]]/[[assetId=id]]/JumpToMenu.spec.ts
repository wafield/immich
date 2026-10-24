import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithTooltips } from '$tests/helpers';
import JumpToMenu from './JumpToMenu.svelte';

describe('JumpToMenu', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Jump to... button', () => {
    renderWithTooltips(JumpToMenu, {
      options: [
        { date: '2026-10-04', label: '2026-10-04 - Day in Paris' },
        { date: '2026-10-03', label: '2026-10-03' },
      ],
      onSelect,
    });

    const button = screen.getByRole('button', { name: /jump to\.\.\./i });
    expect(button).toBeDefined();
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('is disabled when options array is empty', () => {
    renderWithTooltips(JumpToMenu, {
      options: [],
      onSelect,
    });

    const button = screen.getByRole('button', { name: /jump to\.\.\./i });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('opens menu with options when clicked', async () => {
    renderWithTooltips(JumpToMenu, {
      options: [
        { date: '2026-10-04', label: '2026-10-04 - Day in Paris' },
        { date: '2026-10-03', label: '2026-10-03' },
      ],
      onSelect,
    });

    const button = screen.getByRole('button', { name: /jump to\.\.\./i });
    await fireEvent.click(button);

    expect(screen.getByText('2026-10-04 - Day in Paris')).toBeDefined();
    expect(screen.getByText('2026-10-03')).toBeDefined();
  });

  it('calls onSelect with date and closes menu when option is clicked', async () => {
    renderWithTooltips(JumpToMenu, {
      options: [
        { date: '2026-10-04', label: '2026-10-04 - Day in Paris' },
        { date: '2026-10-03', label: '2026-10-03' },
      ],
      onSelect,
    });

    const button = screen.getByRole('button', { name: /jump to\.\.\./i });
    await fireEvent.click(button);

    const optionItem = screen.getByText('2026-10-04 - Day in Paris');
    await fireEvent.click(optionItem);

    expect(onSelect).toHaveBeenCalledWith('2026-10-04');
    await waitFor(() => {
      expect(screen.queryByText('2026-10-04 - Day in Paris')).toBeNull();
    });
  });
});
