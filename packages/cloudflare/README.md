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
import { boundaries } from 'virtual:czap/boundaries';

export const onRequest = cloudflareMiddleware({
  binding: 'CZAP_BOUNDARY_CACHE',
  manifest: boundaries,
  boundary: 'viewport',
});
```

`virtual:czap/boundaries` is the build-derived boundary manifest served by the `@czap/vite` plugin: each entry carries the boundary's minted content address (`Boundary.make`'s `id`) plus precompiled per-tier outputs, so nothing is hand-typed and the worker bundle stays compiler-free. Custom hosts can still pass `boundaryId` (a real `Boundary.make(...).id`) plus a `compile` callback as an escape hatch.

Declare the KV binding in `wrangler.jsonc` and run `czap doctor --target cloudflare` for a preflight check.

See [docs/hosting/cloudflare.md](../../docs/hosting/cloudflare.md) for the full guide.
