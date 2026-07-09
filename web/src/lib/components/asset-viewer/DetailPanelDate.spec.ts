import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/svelte';
import { assetFactory } from '@test-data/factories/asset-factory';
import DetailPanelDate from './DetailPanelDate.svelte';

describe('DetailPanelDate', () => {
  it('displays the user-friendly timezone name when present', () => {
    const asset = assetFactory.build({
      localDateTime: '2023-11-20T01:11:00.000Z',
      exifInfo: {
        dateTimeOriginal: '2023-11-19T18:11:00.000Z',
        timeZone: 'America/Los_Angeles',
      },
    });

    render(DetailPanelDate, {
      props: {
        asset,
      },
    });

    // In 'en' locale, the time formatting might look like: "Sun, 6:11:00 PM America/Los_Angeles"
    // We just assert that "America/Los_Angeles" is visible in the text.
    expect(screen.getByText(/America\/Los_Angeles/)).toBeInTheDocument();
  });

  it('does not display a timezone offset or name when timeZone is not present', () => {
    const asset = assetFactory.build({
      localDateTime: '2023-11-20T01:11:00.000Z',
      exifInfo: undefined,
    });

    render(DetailPanelDate, {
      props: {
        asset,
      },
    });

    // It should format the localDateTime/UTC time but shouldn't display 'UTC' or GMT offsets
    // Since timezone is null, it should display the date and time without timezone suffix
    expect(screen.queryByText(/UTC/)).toBeNull();
    expect(screen.queryByText(/GMT/)).toBeNull();
  });
});
