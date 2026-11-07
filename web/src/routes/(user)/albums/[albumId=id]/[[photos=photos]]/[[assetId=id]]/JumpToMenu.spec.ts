import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import JumpToMenu from './JumpToMenu.svelte';

describe('JumpToMenu', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Jump to... button', async () => {
    const screen = await render(JumpToMenu, {
      options: [
        { date: '2026-10-04', label: '2026-10-04 - Day in Paris' },
        { date: '2026-10-03', label: '2026-10-03' },
      ],
      onSelect,
    });

    const button = screen.getByRole('button', { name: /jump to\.\.\./i });
    await expect.element(button).toBeInTheDocument();
    await expect.element(button).not.toBeDisabled();
  });

  it('is disabled when options array is empty', async () => {
    const screen = await render(JumpToMenu, {
      options: [],
      onSelect,
    });

    const button = screen.getByRole('button', { name: /jump to\.\.\./i });
    await expect.element(button).toBeDisabled();
  });

  it('opens menu with options when clicked', async () => {
    const screen = await render(JumpToMenu, {
      options: [
        { date: '2026-10-04', label: '2026-10-04 - Day in Paris' },
        { date: '2026-10-03', label: '2026-10-03' },
      ],
      onSelect,
    });

    const button = screen.getByRole('button', { name: /jump to\.\.\./i });
    await userEvent.click(button);

    await expect.element(screen.getByText('2026-10-04 - Day in Paris')).toBeInTheDocument();
    await expect.element(screen.getByText('2026-10-03')).toBeInTheDocument();
  });

  it('calls onSelect with date and closes menu when option is clicked', async () => {
    const screen = await render(JumpToMenu, {
      options: [
        { date: '2026-10-04', label: '2026-10-04 - Day in Paris' },
        { date: '2026-10-03', label: '2026-10-03' },
      ],
      onSelect,
    });

    const button = screen.getByRole('button', { name: /jump to\.\.\./i });
    await userEvent.click(button);

    const optionItem = screen.getByText('2026-10-04 - Day in Paris');
    await userEvent.click(optionItem);

    expect(onSelect).toHaveBeenCalledWith('2026-10-04');
    await expect.element(screen.getByText('2026-10-04 - Day in Paris')).not.toBeInTheDocument();
  });
});
