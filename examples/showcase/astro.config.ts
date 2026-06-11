import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { integration } from '@czap/astro';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  integrations: [
    integration({
      detect: true,
      stream: { enabled: true },
      llm: { enabled: true },
      workers: { enabled: true },
      gpu: { enabled: true, preferWebGPU: false },
      wasm: { enabled: true },
      // Point primitive resolution at the convention directories so the
      // @token / @theme / @quantize blocks inside .astro styles find
      // their defs.
      vite: {
        dirs: {
          boundary: dir('./src/boundaries'),
          token: dir('./src/tokens'),
          theme: dir('./src/themes'),
        },
      },
    }),
  ],
});
