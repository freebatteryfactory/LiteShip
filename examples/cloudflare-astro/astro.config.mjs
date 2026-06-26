import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { integration } from '@czap/astro';
import { cloudflareCacheProvider } from '@czap/cloudflare/cache-provider';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [integration()],
  cache: {
    provider: cloudflareCacheProvider({ binding: 'CZAP_BOUNDARY_CACHE' }),
  },
  routeRules: {
    '/': { cache: { maxAge: 300, tags: ['viewport'] } },
  },
});
