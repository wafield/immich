import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  PUBLIC_IMMICH_BUY_HOST: { public: true, static: true },
  PUBLIC_IMMICH_PAY_HOST: { public: true, static: true },
  PUBLIC_GOOGLE_MAPS_API_KEY: { public: true, static: true },
});
