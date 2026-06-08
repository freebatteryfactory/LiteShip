# `@czap/cloudflare`

Cloudflare Workers **siteAdapter** for LiteShip — wires Workers KV bindings to `@czap/edge` boundary caching via `@czap/astro` middleware.

## Install

```bash
pnpm add @czap/cloudflare @czap/astro @astrojs/cloudflare astro@^6 wrangler@^4
```

## Usage

```ts
// src/middleware.ts
import { cloudflareMiddleware } from '@czap/cloudflare';

export const onRequest = cloudflareMiddleware({
  binding: 'CZAP_BOUNDARY_CACHE',
  boundaryId: 'sha256:your-boundary-id',
  compile: async () => ({
    css: '',
    propertyRegistrations: [],
    containerQueries: [],
  }),
});
```

Declare the KV binding in `wrangler.jsonc` and run `czap doctor --target cloudflare` for a preflight check.

See [docs/hosting/cloudflare.md](../../docs/hosting/cloudflare.md) for the full guide.
