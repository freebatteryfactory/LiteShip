# Hosting LiteShip — first-hour checklist

LiteShip runs inside the host application's security boundary: the host's CSP, the host's Trusted Types policy, the host's runtime endpoints. This page is the **minimum host checklist** to get a fresh install through its first page render without surprises.

For the security architecture this checklist enforces, see [SECURITY.md](./SECURITY.md). For an end-to-end tutorial, see [GETTING-STARTED.md](./GETTING-STARTED.md). For Cloudflare Workers, jump to the [Cloudflare Workers](#cloudflare-workers) section below.

## Minimum versions

| Tool | Version | Why |
| --- | --- | --- |
| Node | `>= 22` | Built-in `crypto.subtle`, modern stream primitives, `import.meta.dirname` |
| pnpm | `>= 10` | Workspace protocol behavior, `pnpm-workspace.yaml` settings discipline |
| Vite | `8.x` | The `@czap/vite` plugin targets Vite 8's plugin API |
| Astro | `7.x` | The `@czap/astro` integration targets Astro 7's middleware + bootstrap surface |

## Required CSP directives

```
worker-src 'self' blob:
connect-src 'self' https://<your-SSE-or-LLM-endpoints>
script-src  'self' 'nonce-<per-request>'        # nonce threaded by your host
```

If you enforce Trusted Types: also add `require-trusted-types-for 'script'`. The runtime auto-creates a `czap` policy on first use; pre-install only if you want stricter behavior than the upstream sanitizer (see Failure 3 below).

## Five hour-one failures (and how to fix them)

### 1. Off-thread workers silently never start

**Symptom:** Compositor reports inert, no rendering happens off-thread, no error in the page console.

**Cause:** CSP `worker-src 'self'` blocks the `blob:`-URL worker bootstrap. The compositor, render worker, and audio processor are all spawned from inline `Blob` objects.

**Fix:** Add `blob:` to `worker-src` (`worker-src 'self' blob:`). The `blob:` source is a wildcard for any blob the page can construct — see SECURITY.md §worker-src for the threat-model tradeoff and the future packaging mode that avoids it.

### 2. SSE/LLM connection refused

**Symptom:** Stream session opens but never receives messages; browser console shows `Refused to connect to 'https://...' because it violates the following Content Security Policy directive: "connect-src 'self'"`.

**Cause:** Your runtime endpoint isn't in `connect-src`, or it is but isn't in LiteShip's runtime-URL allowlist policy.

**Fix:** Two places must agree:
1. CSP `connect-src` must include the endpoint origin.
2. The runtime URL allowlist policy (configured via the Astro integration or `policy` field on the runtime session) must include the cross-origin endpoint. Same-origin is allowed by default; cross-origin is opt-in. See SECURITY.md §Runtime URL allowlist.

Note that the hostname blocklist rejects literal private-IP strings (`127.0.0.1`, `10.x.x.x`, etc.) but does **not** rewrite hostnames that resolve to private IPs. For DNS-rebinding defense, restrict outbound DNS at the network layer.

### 3. `innerHTML` throws under Trusted Types

**Symptom:** `TypeError: Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML' assignment` thrown during LLM HTML render or DOM morph.

**Cause:** Host installed `require-trusted-types-for 'script'` but no `czap` policy exists yet.

**Fix:** Two options:

- **Default (recommended):** Do nothing. The runtime detects `window.trustedTypes` and auto-creates a passthrough `czap` policy on first use. The sanitizer (`sanitized-html` mode) has already run upstream of the policy callback — the policy is the Trusted Types attestation, not a second sanitizer.

- **Host-installed stricter policy:** If you want defense-in-depth, install before any LiteShip code runs:

  ```ts
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    window.trustedTypes.createPolicy('czap', {
      createHTML: (input) => {
        // Input has already been sanitized upstream. Add second-pass checks
        // here only if you've audited what the sanitizer leaves through.
        return input;
      },
    });
  }
  ```

**Caveat:** Callers can opt into `'trusted-html'` mode (`allowTrustedHtml: true`), which **bypasses the sanitizer**. If your host policy is passthrough and a caller opts into `'trusted-html'`, you have effectively zero filtering on that path. Either keep callers off `'trusted-html'` or have your policy callback sanitize defensively.

### 4. Bootstrap snapshot or runtime policy seems "forgotten"

**Symptom:** After HMR reload or test reset, the runtime policy isn't picked up.

**Cause:** The runtime policy lives in two places: a module-private store (canonical) and a frozen `window.__CZAP_RUNTIME_POLICY__` (cross-bundle broadcast, locked at first publish). HMR re-bootstraps the module-private store; the window broadcast stays frozen.

**Fix:** This is intentional. Reads check the module-private store first. If you're seeing stale state in a test, the test harness needs to call the runtime-policy reset path, not just clear the window broadcast. See `packages/astro/src/runtime/policy.ts`.

### 5. Boundary doesn't re-evaluate after edit

**Symptom:** You changed a boundary's threshold or values, but the cached output didn't change.

**Cause:** Boundary identity is content-addressed (ADR-0003 — FNV-1a over canonical CBOR). Identity is over the *definition*, not the source location. Edits that don't change the canonical encoding (e.g. reordering keys, renaming a local variable) yield the same hash, and the cache holds.

**Fix:** This is intended. If you actually changed the definition, the hash changes and downstream work re-fires. If you didn't, no work happens — that's the cache doing its job. To force a recompute, change a definition field rather than rearranging unchanged data.

## Cloudflare Workers

LiteShip runs on Cloudflare Workers via Astro 7 + `@astrojs/cloudflare` v14+. The `@czap/cloudflare` package wires Workers KV to `@czap/edge` boundary caching through `@czap/astro` middleware.

### Minimum versions (Cloudflare-specific)

On top of Node `>= 22` and pnpm `>= 10` from the table above:

| Tool | Version | Notes |
| --- | --- | --- |
| Astro | `7.x` | Required by `@astrojs/cloudflare` v14 peer |
| `@astrojs/cloudflare` | `14+` | workerd in `astro dev` via `@cloudflare/vite-plugin` |
| Wrangler | `4.x` | Deploy + local KV preview |
| `@czap/cloudflare` | workspace / npm | siteAdapter + middleware glue |

**Vite note:** LiteShip's `@czap/vite` plugin targets Vite 8. Astro 7 bundles Vite 8 internally (Rolldown-backed), so `@czap/vite` and Astro now share the Vite 8 major — the Cloudflare adapter owns the workerd dev server.

### Quick start

See the runnable proof at [`examples/cloudflare-astro/`](./examples/cloudflare-astro/).

```bash
pnpm install
pnpm run build
cd examples/cloudflare-astro
pnpm run dev
```

### astro.config.mjs

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

### wrangler.jsonc

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

Astro 7 may also emit `dist/server/wrangler.json` on build; keep your source `wrangler.jsonc` as the deploy source of truth when you need custom bindings.

### Middleware (KV wiring)

The boundary cache config is **derived at build time**. The `@czap/vite` plugin scans your boundary modules (`boundaries.ts` / `*.boundaries.ts`) and `@quantize` CSS blocks, then serves the result as the `virtual:czap/boundaries` manifest: each entry carries the boundary's minted content address (`Boundary.make`'s `id`, `fnv1a:xxxxxxxx`) plus precompiled outputs for every (motion x design) tier. Hand the manifest to the middleware — never hand-type a boundary id:

```typescript
// src/middleware.ts
import { cloudflareMiddleware } from '@czap/cloudflare';
import { boundaries } from 'virtual:czap/boundaries';

export const onRequest = cloudflareMiddleware({
  binding: 'CZAP_BOUNDARY_CACHE',
  manifest: boundaries,
  boundary: 'viewport', // optional when the manifest has exactly one boundary
  tags: ['products'],   // match Astro routeRules.tags when using cache.invalidate()
});
```

For editor types on the virtual module, add to `src/env.d.ts`:

```typescript
/// <reference types="@czap/vite/virtual" />
```

The build also emits `czap-boundary-manifest.json` into the output directory (via the `@czap/astro` integration's `astro:build:done` hook) for hosts that read the manifest from disk instead of importing the virtual module.

**Escape hatch:** custom hosts can still pass `boundaryId` + `compile` directly. `boundaryId` must be a real minted address (`Boundary.make(...).id`) — the KV keyspace is content-addressed, so a fabricated id breaks content-addressing (the cache could then serve another boundary's CSS). A `compile` callback may also be combined with `manifest` as a fallback for tiers the manifest does not cover.

Bindings are read from the `cloudflare:workers` `env` at request time.

### Astro 7 fetch layer

Astro 7 hosts can put CZAP before Astro's own request handlers with `src/fetch.ts`:

```typescript
import { FetchState, astro } from 'astro/fetch';
import { czapFetchLayer } from '@czap/astro/fetch-layer';
import { resolveOutputsByTier } from '@czap/edge';
import { boundaries } from 'virtual:czap/boundaries';
import { env } from 'cloudflare:workers';

const layer = czapFetchLayer({
  edge: {
    cache: {
      kv: env.CZAP_BOUNDARY_CACHE,
      boundaries: {
        viewport: {
          boundaryId: boundaries.viewport.id,
          precompiled: resolveOutputsByTier(boundaries.viewport),
          tags: ['products'],
        },
      },
    },
  },
});

export default {
  fetch: (request: Request) => layer(request, (req) => astro(new FetchState(req))),
};
```

The layer and `czapMiddleware()` share the same edge resolver; do not build a second KV key or cache lookup in `src/fetch.ts`.

### Astro cache provider

Use `@czap/cloudflare/cache-provider` when Astro route-cache invalidation should purge CZAP boundary CSS too:

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { cloudflareCacheProvider } from '@czap/cloudflare/cache-provider';

export default defineConfig({
  cache: {
    provider: cloudflareCacheProvider({
      binding: 'CZAP_BOUNDARY_CACHE',
      prefix: 'my-deploy',
      // Optional exact route path -> boundary id map for native path invalidation.
      pathBoundaries: { '/products': '<Boundary.make(...).id>' },
    }),
  },
  routeRules: {
    '/products': { cache: { maxAge: 300, tags: ['products'] } },
  },
});
```

For tag invalidation, use the same tag names in `routeRules.tags` and `cloudflareMiddleware({ tags })` / `czapFetchLayer({ edge: { cache: { tags } } })`. A compile fallback writes those tags into the boundary KV index, and `cache.invalidate({ tags: 'products' })` purges every tier/theme variant under that tag. For path invalidation, the provider also purges Astro's path tag (`astro-path:/products`) and, when `pathBoundaries` is supplied, actively lists/deletes every KV variant for that boundary id.

### Preflight

```bash
czap doctor --target cloudflare --ci
```

Run from your app directory. Checks Astro 7, `@astrojs/cloudflare` v14+, Wrangler, wrangler config, and output mode.

### Deploy

```bash
pnpm run build
pnpm exec wrangler deploy
```

Create the KV namespace first: `pnpm exec wrangler kv namespace create CZAP_BOUNDARY_CACHE`

### CSP and isolation (Cloudflare)

Same browser CSP as [Required CSP directives](#required-csp-directives) above. If you enable `client:worker` in `@czap/astro`, also emit COOP/COEP on HTML responses (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`). See [SECURITY.md](./SECURITY.md) §Cloudflare Workers.

### KV trust boundary

Treat KV as a host-controlled cache — not a secrets store. A KV entry is keyed by the boundary's content address (`Boundary.make`'s FNV-1a address per ADR-0003), the device tier, the boundary name, and a fingerprint of the resolved theme — so an entry only serves a request whose inputs match. `ttl` and `prefix` are configurable on `cloudflareMiddleware`; `prefix` doubles as a per-deploy content version, which a bundled `compile()` whose output depends on build-time content the boundary id doesn't cover must bump. Deploys that change boundary content mint new content addresses, stranding the old keys (never re-read) — Workers KV never evicts and bills storage, so set `ttl` (e.g. `2592000` = 30 days) to reclaim them. Requests whose tier is covered by the manifest are served from the bundle without touching KV at all (`cacheStatus: 'precompiled'`); KV only backs the `compile` fallback path.

## Where to look next

- [SECURITY.md](./SECURITY.md) — full security posture, allowlist details, sanitizer reference
- [GETTING-STARTED.md](./GETTING-STARTED.md) — install → hello-world boundary → cast to CSS → hydrate through Astro
- [ARCHITECTURE.md](./ARCHITECTURE.md) — module DAG and projection pipeline
- [RELEASING.md](./RELEASING.md) — release flow for maintainers (ADR-0011 ShipCapsules)
