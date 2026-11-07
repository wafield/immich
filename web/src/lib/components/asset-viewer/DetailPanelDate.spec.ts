import { factory } from '#test/unit/factories.ts';
import { expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DetailPanelDate from './DetailPanelDate.svelte';

describe('DetailPanelDate', () => {
  it('displays the user-friendly timezone name when present', async () => {
    const asset = factory.asset({
      localDateTime: '2023-11-20T01:11:00.000Z',
      exifInfo: {
        dateTimeOriginal: '2023-11-19T18:11:00.000Z',
        timeZone: 'America/Los_Angeles',
      },
    });

    const screen = await render(DetailPanelDate, {
      asset,
    });

    await expect.element(screen.getByText(/America\/Los_Angeles/)).toBeInTheDocument();
  });

  it('does not display a timezone offset or name when timeZone is not present', async () => {
    const asset = factory.asset({
      localDateTime: '2023-11-20T01:11:00.000Z',
      exifInfo: undefined,
    });

    const screen = await render(DetailPanelDate, {
      asset,
    });

    await expect.element(screen.getByText(/UTC/)).not.toBeInTheDocument();
    await expect.element(screen.getByText(/GMT/)).not.toBeInTheDocument();
  });
});
