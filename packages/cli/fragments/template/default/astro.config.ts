import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
// One import path: the Astro integration rides the `liteship/astro` subpath.
import { integration } from 'liteship/astro';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  integrations: [
    integration({
      detect: true,
      // Tell the plugin where your definitions live so `@token` / `@style` /
      // `@quantize` blocks resolve them by name at build time.
      vite: {
        dirs: {
          boundary: dir('./src/boundaries'),
          token: dir('./src/tokens'),
          style: dir('./src/styles'),
        },
      },
    }),
  ],
});
