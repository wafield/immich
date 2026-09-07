import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getAnimateMock } from '$lib/__mocks__/animate.mock';
import { getIntersectionObserverMock } from '$lib/__mocks__/intersection-observer.mock';
import { getVisualViewportMock } from '$lib/__mocks__/visual-viewport.mock';
import Combobox from '../Combobox.svelte';

describe('Combobox component', () => {
  const options = [
    { label: 'Pacific/Midway (-11:00)', value: 'Pacific/Midway' },
    { label: 'Europe/Berlin (+01:00)', value: 'Europe/Berlin' },
    { label: 'America/New_York (-05:00)', value: 'America/New_York' },
    { label: 'America/St_Johns (−03:30)', value: 'America/St_Johns' }, // with Unicode minus sign U+2212
    { label: 'Asia/Tokyo (＋09:00)', value: 'Asia/Tokyo' }, // with fullwidth plus U+FF0B
    { label: 'São Paulo (-03:00)', value: 'America/Sao_Paulo' },
  ];

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', getIntersectionObserverMock());
    vi.stubGlobal('visualViewport', getVisualViewportMock());
    Element.prototype.animate = getAnimateMock();
  });

  test('filters options with ASCII minus sign', async () => {
    render(Combobox, {
      props: {
        label: 'Timezone',
        options,
      },
    });

    const input = screen.getByRole('combobox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: '-11' } });

    expect(screen.getByText('Pacific/Midway (-11:00)')).toBeInTheDocument();
    expect(screen.queryByText('Europe/Berlin (+01:00)')).not.toBeInTheDocument();
    expect(screen.queryByText('America/New_York (-05:00)')).not.toBeInTheDocument();
  });

  test('filters options when searching without sign', async () => {
    render(Combobox, {
      props: {
        label: 'Timezone',
        options,
      },
    });

    const input = screen.getByRole('combobox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: '11' } });

    expect(screen.getByText('Pacific/Midway (-11:00)')).toBeInTheDocument();
    expect(screen.queryByText('Europe/Berlin (+01:00)')).not.toBeInTheDocument();
  });

  test('matches option with unicode minus sign when searching with ASCII minus', async () => {
    render(Combobox, {
      props: {
        label: 'Timezone',
        options,
      },
    });

    const input = screen.getByRole('combobox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: '-03:30' } });

    expect(screen.getByText('America/St_Johns (−03:30)')).toBeInTheDocument();
  });

  test('matches option with ASCII minus sign when searching with Unicode minus', async () => {
    render(Combobox, {
      props: {
        label: 'Timezone',
        options,
      },
    });

    const input = screen.getByRole('combobox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: '−11' } });

    expect(screen.getByText('Pacific/Midway (-11:00)')).toBeInTheDocument();
  });

  test('filters options with plus sign', async () => {
    render(Combobox, {
      props: {
        label: 'Timezone',
        options,
      },
    });

    const input = screen.getByRole('combobox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: '+01' } });

    expect(screen.getByText('Europe/Berlin (+01:00)')).toBeInTheDocument();
    expect(screen.queryByText('Pacific/Midway (-11:00)')).not.toBeInTheDocument();
  });

  test('filters options with fullwidth plus sign', async () => {
    render(Combobox, {
      props: {
        label: 'Timezone',
        options,
      },
    });

    const input = screen.getByRole('combobox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: '+09' } });

    expect(screen.getByText('Asia/Tokyo (＋09:00)')).toBeInTheDocument();
  });

  test('filters options ignoring accents', async () => {
    render(Combobox, {
      props: {
        label: 'Timezone',
        options,
      },
    });

    const input = screen.getByRole('combobox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'sao' } });

    expect(screen.getByText('São Paulo (-03:00)')).toBeInTheDocument();
  });

  test('user typing with minus sign via userEvent', async () => {
    const user = userEvent.setup();

    render(Combobox, {
      props: {
        label: 'Timezone',
        options,
      },
    });

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, '-11');

    expect(screen.getByText('Pacific/Midway (-11:00)')).toBeInTheDocument();
    expect(screen.queryByText('Europe/Berlin (+01:00)')).not.toBeInTheDocument();
  });
});
