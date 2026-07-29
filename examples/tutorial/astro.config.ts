import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { liteship } from '@liteship/astro';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  integrations: [
    liteship({
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
