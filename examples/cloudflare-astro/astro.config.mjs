import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { integration } from '@czap/astro';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [integration({ detect: true })],
});
