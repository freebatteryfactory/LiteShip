import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { integration } from '@liteship/astro';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  integrations: [
    integration({
      detect: true,
      // Optional generated UI: `pnpm add @liteship/genui`, define a catalog with
      // `defineComponentCatalog`, pass `genuiCatalog` to createLLMSession (or
      // set `data-liteship-genui` on `client:llm`). See GETTING-STARTED.md.
      vite: {
        dirs: {
          boundary: dir('./src/boundaries'),
          token: dir('./src/tokens'),
        },
      },
    }),
  ],
});
