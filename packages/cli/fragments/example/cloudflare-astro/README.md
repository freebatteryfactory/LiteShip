# Cloudflare + Astro example

Minimal Astro 7 app on `@astrojs/cloudflare` v14 with `@liteship/cloudflare` KV boundary caching.

When installing from npm (outside the monorepo), pin `@liteship/*` packages at `^0.19.0`.

The boundary cache config is build-derived: `src/boundaries.ts` exports the `viewport` boundary (`defineBoundary` mints its content address), `src/styles.css` holds the `@quantize viewport` block, and `src/middleware.ts` feeds the resulting `virtual:liteship/boundaries` manifest to `cloudflareMiddleware` — no hand-typed ids, no compiler in the worker bundle. `astro.config.mjs` wires `@liteship/cloudflare/cache-provider` and matching `routeRules.tags` so Astro 7 `cache.invalidate({ tags })` reaches the same KV tag index. The build also emits `liteship-boundary-manifest.json` into the output directory.

The `/` page also demonstrates the responsive-media host path (#140): because `cloudflareMiddleware` wraps `liteshipMiddleware`, `Astro.locals.liteship.responsiveMedia(intent)` runs on the Workers edge — it derives Save-Data / DPR caps from the request's Client Hints and projects ONE authored `ResponsiveMedia.intent` through `@liteship/core`'s `selectCandidates` law. Under `Save-Data` every artifact (`src` / `srcset` / `<source>` / the `<head>` preload) collapses to the light asset, and the response merges the responsive `Vary` axis (`Sec-CH-DPR, Save-Data`).

## Prerequisites

- Node.js 22.13+
- pnpm 10+
- Cloudflare account (for deploy)

## Local development

From the repo root:

```bash
pnpm install
pnpm run build
cd examples/cloudflare-astro
pnpm run dev
```

## Deploy

1. Create a KV namespace: `pnpm exec wrangler kv namespace create LITESHIP_BOUNDARY_CACHE`
2. Replace placeholder `id` / `preview_id` in `wrangler.jsonc` with your namespace IDs.
3. Preflight: `pnpm exec liteship doctor --target cloudflare --ci` (from this directory).
4. Build and deploy: `pnpm run build && pnpm exec wrangler deploy`

See [HOSTING.md](../../HOSTING.md#cloudflare-workers) for the full guide.
