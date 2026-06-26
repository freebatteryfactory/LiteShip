import { cloudflareMiddleware } from '@czap/cloudflare';
import { boundaries } from 'virtual:czap/boundaries';

// `boundaries` is the build-derived manifest: each entry carries the
// boundary's minted content address (Boundary.make's `id`) plus the
// precompiled per-tier outputs from the @quantize CSS block -- nothing
// here is hand-typed, and the worker bundle stays compiler-free.
export const onRequest = cloudflareMiddleware({
  // `binding` defaults to 'CZAP_BOUNDARY_CACHE' (the wrangler.jsonc
  // kv_namespaces binding name) — omit it unless you override that name.
  manifest: boundaries,
  boundary: 'viewport',
  // Match astro.config.mjs routeRules.tags so Astro cache.invalidate({ tags })
  // and CZAP boundary invalidation address the same KV tag index.
  tags: ['viewport'],
});
