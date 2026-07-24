import { cloudflareMiddleware } from '@liteship/cloudflare';
import { boundaries } from 'virtual:liteship/boundaries';

// `boundaries` is the build-derived manifest: each entry carries the
// boundary's minted content address (defineBoundary's `id`) plus the
// precompiled per-tier outputs from the @quantize CSS block -- nothing
// here is hand-typed, and the worker bundle stays compiler-free.
export const onRequest = cloudflareMiddleware({
  // `binding` defaults to 'LITESHIP_BOUNDARY_CACHE' (the wrangler.jsonc
  // kv_namespaces binding name) — omit it unless you override that name.
  manifest: boundaries,
  boundary: 'viewport',
  // Match astro.config.mjs routeRules.tags so Astro cache.invalidate({ tags })
  // and LiteShip boundary invalidation address the same KV tag index.
  tags: ['viewport'],
});
