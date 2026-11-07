import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import Combobox from '../Combobox.svelte';

describe('Combobox component', () => {
  const options = [
    { label: 'Pacific/Midway (-11:00)', value: 'Pacific/Midway' },
    { label: 'Europe/Berlin (+01:00)', value: 'Europe/Berlin' },
    { label: 'America/New_York (-05:00)', value: 'America/New_York' },
    { label: 'America/St_Johns (−03:30)', value: 'America/St_Johns' },
    { label: 'Asia/Tokyo (＋09:00)', value: 'Asia/Tokyo' },
    { label: 'São Paulo (-03:00)', value: 'America/Sao_Paulo' },
  ];

  test('filters options with ASCII minus sign', async () => {
    const screen = await render(Combobox, {
      label: 'Timezone',
      options,
    });

    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.fill(input, '-11');

    await expect.element(screen.getByText('Pacific/Midway (-11:00)')).toBeInTheDocument();
    await expect.element(screen.getByText('Europe/Berlin (+01:00)')).not.toBeInTheDocument();
    await expect.element(screen.getByText('America/New_York (-05:00)')).not.toBeInTheDocument();
  });

  test('filters options when searching without sign', async () => {
    const screen = await render(Combobox, {
      label: 'Timezone',
      options,
    });

    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.fill(input, '11');

    await expect.element(screen.getByText('Pacific/Midway (-11:00)')).toBeInTheDocument();
    await expect.element(screen.getByText('Europe/Berlin (+01:00)')).not.toBeInTheDocument();
  });

  test('matches option with unicode minus sign when searching with ASCII minus', async () => {
    const screen = await render(Combobox, {
      label: 'Timezone',
      options,
    });

    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.fill(input, '-03:30');

    await expect.element(screen.getByText('America/St_Johns (−03:30)')).toBeInTheDocument();
  });

  test('matches option with ASCII minus sign when searching with Unicode minus', async () => {
    const screen = await render(Combobox, {
      label: 'Timezone',
      options,
    });

    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.fill(input, '−11');

    await expect.element(screen.getByText('Pacific/Midway (-11:00)')).toBeInTheDocument();
  });

  test('filters options with plus sign', async () => {
    const screen = await render(Combobox, {
      label: 'Timezone',
      options,
    });

    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.fill(input, '+01');

    await expect.element(screen.getByText('Europe/Berlin (+01:00)')).toBeInTheDocument();
    await expect.element(screen.getByText('Pacific/Midway (-11:00)')).not.toBeInTheDocument();
  });

  test('filters options with fullwidth plus sign', async () => {
    const screen = await render(Combobox, {
      label: 'Timezone',
      options,
    });

    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.fill(input, '+09');

    await expect.element(screen.getByText('Asia/Tokyo (＋09:00)')).toBeInTheDocument();
  });

  test('filters options ignoring accents', async () => {
    const screen = await render(Combobox, {
      label: 'Timezone',
      options,
    });

    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.fill(input, 'sao');

    await expect.element(screen.getByText('São Paulo (-03:00)')).toBeInTheDocument();
  });

  test('user typing with minus sign via userEvent', async () => {
    const screen = await render(Combobox, {
      label: 'Timezone',
      options,
    });

    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, '-11');

    await expect.element(screen.getByText('Pacific/Midway (-11:00)')).toBeInTheDocument();
    await expect.element(screen.getByText('Europe/Berlin (+01:00)')).not.toBeInTheDocument();
  });
});
