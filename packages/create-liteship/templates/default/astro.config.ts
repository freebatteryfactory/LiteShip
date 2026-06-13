import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { integration } from '@czap/astro';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  integrations: [
    integration({
      detect: true,
      // Optional generated UI: `pnpm add @czap/genui`, define a catalog with
      // `defineComponentCatalog`, pass `genuiCatalog` to createLLMSession (or
      // set `data-czap-genui` on `client:llm`). See docs/GETTING-STARTED.md.
      vite: {
        dirs: {
          boundary: dir('./src/boundaries'),
          token: dir('./src/tokens'),
        },
      },
    }),
  ],
});
