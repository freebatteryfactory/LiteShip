import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { integration } from '@czap/astro';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  integrations: [
    integration({
      // `gpu` defaults on; this example only overrides the WebGPU preference.
      // `detect` / `stream` / `llm` are on by default too, so they need no
      // opt-in. `workers` does default off — the worker.astro demo needs it.
      workers: { enabled: true },
      gpu: { preferWebGPU: false },
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
