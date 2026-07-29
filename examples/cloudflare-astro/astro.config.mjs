import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { liteship } from '@liteship/astro';
import { cloudflareCacheProvider } from '@liteship/cloudflare/cache-provider';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [liteship({ vite: { emitBoundaryAssets: true } })],
  cache: {
    provider: cloudflareCacheProvider({ binding: 'LITESHIP_BOUNDARY_CACHE' }),
  },
  routeRules: {
    '/': { cache: { maxAge: 300, tags: ['viewport'] } },
  },
});
