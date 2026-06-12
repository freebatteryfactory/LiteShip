import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { integration } from '@czap/astro';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  integrations: [
    integration({
      // Point primitive resolution at the convention directories so the
      // @token / @quantize blocks inside .astro styles find their defs.
      vite: {
        dirs: {
          boundary: dir('./src/boundaries'),
          token: dir('./src/tokens'),
        },
      },
    }),
  ],
});
