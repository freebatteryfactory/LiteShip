import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { integration } from '@czap/astro';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Server-rendered on purpose. The page resolves the boundary's initial state
  // from the request's viewport client hint, so the SSR'd `data-czap-state` (and
  // the `@aria` it carries) already matches the container-query CSS at first
  // paint — the accessibility state and the pixels agree from byte one, no
  // reconcile-on-hydration window. Any Node-based SSR host works.
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    integration({
      // Auto-wire the czap middleware so responses carry `Accept-CH` /
      // `Critical-CH` (`Sec-CH-Viewport-Width`). `Critical-CH` makes the browser
      // resend the hint BEFORE the first render, so even a cold first visit is
      // resolved correctly — the client-hint bootstrap has no drift gap.
      middleware: true,
      // Resolve the `@quantize nav { ... }` block's boundary name from src/boundaries.
      vite: { dirs: { boundary: dir('./src/boundaries') } },
    }),
  ],
});
