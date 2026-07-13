import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { integration } from '@czap/astro';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Static by default — every PAGE prerenders to HTML (StackBlitz/static-host friendly).
  // The `src/pages/api/*` SSE routes opt OUT (`prerender = false`) so they run on-demand
  // with the correct `text/event-stream` MIME (a prerendered EventSource is a broken
  // static snapshot). The adapter serves just those routes; pages stay static.
  output: 'static',
  adapter: cloudflare(),
  integrations: [
    integration({
      // `gpu` defaults on; this example only overrides the WebGPU preference.
      // `detect` / `stream` / `llm` are on by default too, so they need no
      // opt-in. `workers` does default off — the worker.astro demo needs it.
      workers: { enabled: true },
      // The continuous-motion floor demo (/motion) needs the client:motion runtime.
      motion: { enabled: true },
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
