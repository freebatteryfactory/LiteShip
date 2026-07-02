import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { integration } from '@czap/astro';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  integrations: [
    integration({
      // Resolve the `@quantize nav { ... }` block's boundary name from src/boundaries.
      vite: { dirs: { boundary: dir('./src/boundaries') } },
    }),
  ],
});
