# Hosting LiteShip on Cloudflare Workers

LiteShip runs on Cloudflare Workers via Astro 6 + `@astrojs/cloudflare` v13+. The `@czap/cloudflare` package wires Workers KV to `@czap/edge` boundary caching through `@czap/astro` middleware.

## Minimum versions

| Tool | Version | Notes |
| --- | --- | --- |
| Node | `>= 22` | Matches repo engines |
| pnpm | `>= 10` | Workspace installs |
| Astro | `6.3+` | Required by `@astrojs/cloudflare` v13 peer |
| `@astrojs/cloudflare` | `13+` | workerd in `astro dev` via `@cloudflare/vite-plugin` |
| Wrangler | `4.x` | Deploy + local KV preview |
| `@czap/cloudflare` | workspace / npm | siteAdapter + middleware glue |

**Vite note:** LiteShip's `@czap/vite` plugin targets Vite 8. Astro 6 bundles Vite 7 internally for its toolchain; both coexist — the Cloudflare adapter owns the workerd dev server.

## Quick start

See the runnable proof at [`examples/cloudflare-astro/`](../../examples/cloudflare-astro/).

```bash
pnpm install
pnpm run build
cd examples/cloudflare-astro
pnpm run dev
```

## astro.config.mjs

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { integration } from '@czap/astro';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [integration({ detect: true })],
});
```

## wrangler.jsonc

Declare KV for boundary caching and Node.js compatibility:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-liteship-app",
  "compatibility_date": "2026-06-08",
  "compatibility_flags": ["nodejs_compat"],
  "kv_namespaces": [
    {
      "binding": "CZAP_BOUNDARY_CACHE",
      "id": "<your-kv-namespace-id>",
      "preview_id": "<your-preview-kv-namespace-id>"
    }
  ]
}
```

Astro 6 may also emit `dist/server/wrangler.json` on build; keep your source `wrangler.jsonc` as the deploy source of truth when you need custom bindings.

## Middleware (KV wiring)

```typescript
// src/middleware.ts
import { cloudflareMiddleware } from '@czap/cloudflare';

export const onRequest = cloudflareMiddleware({
  binding: 'CZAP_BOUNDARY_CACHE',
  boundaryId: 'fnv1a:your-boundary-id',
  compile: async () => ({
    css: '',
    propertyRegistrations: '',
    containerQueries: '',
  }),
});
```

Bindings are read from `cloudflare:workers` `env` at request time (Astro 6 removed `Astro.locals.runtime`).

## Preflight

```bash
czap doctor --target cloudflare --ci
```

Run from your app directory. Checks Astro 6, `@astrojs/cloudflare` v13+, Wrangler, wrangler config, and output mode.

## Deploy

```bash
pnpm run build
pnpm exec wrangler deploy
```

Create the KV namespace first: `pnpm exec wrangler kv namespace create CZAP_BOUNDARY_CACHE`

## CSP and isolation

Same browser CSP requirements as [HOSTING.md](../HOSTING.md):

```
worker-src 'self' blob:
connect-src 'self' https://<your-SSE-or-LLM-endpoints>
```

If you enable `client:worker` in `@czap/astro`, emit COOP/COEP on HTML responses (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`). See [SECURITY.md](../SECURITY.md) §Cloudflare Workers.

## KV trust boundary

Treat KV as a host-controlled cache — not a secrets store. Boundary compile outputs are content-addressed; TTL and prefix are configurable on `cloudflareMiddleware`.
