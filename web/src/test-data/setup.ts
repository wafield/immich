import '@testing-library/jest-dom';
import { init } from 'svelte-i18n';

beforeAll(async () => {
  await init({ fallbackLocale: 'dev' });
  Element.prototype.animate = vi.fn().mockImplementation(function () {
    return { cancel: () => {}, finished: Promise.resolve() };
  });
});

Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }),
});

vi.mock('$env/dynamic/public', () => {
  return {
    env: {
      PUBLIC_IMMICH_HOSTNAME: '',
    },
  };
});

vi.mock('$env/static/public', () => {
  return {
    PUBLIC_IMMICH_BUY_HOST: 'https://buy.immich.app',
    PUBLIC_IMMICH_PAY_HOST: 'https://pay.futo.org',
    PUBLIC_GOOGLE_MAPS_API_KEY: '',
  };
});
