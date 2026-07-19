import { defineConfig } from 'astro/config';
import { integration } from '@liteship/astro';

export default defineConfig({
  integrations: [
    integration({
      detect: true,
      serverIslands: false,
    }),
  ],
});
