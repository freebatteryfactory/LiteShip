# Cloudflare + Astro example

Minimal Astro 6 app on `@astrojs/cloudflare` v13 with `@czap/cloudflare` KV boundary caching.

## Prerequisites

- Node.js 22+
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

1. Create a KV namespace: `pnpm exec wrangler kv namespace create CZAP_BOUNDARY_CACHE`
2. Replace placeholder `id` / `preview_id` in `wrangler.jsonc` with your namespace IDs.
3. Preflight: `pnpm exec czap doctor --target cloudflare --ci` (from this directory).
4. Build and deploy: `pnpm run build && pnpm exec wrangler deploy`

See [docs/hosting/cloudflare.md](../../docs/hosting/cloudflare.md) for the full guide.
