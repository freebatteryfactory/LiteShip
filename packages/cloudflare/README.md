# @czap/cloudflare

Astro middleware glue that serves LiteShip's per-tier compiled boundary CSS from Cloudflare Workers KV.

> Install this directly when you deploy an Astro 7 site on Cloudflare Workers.
> If you're starting a new project, start with
> [`@czap/astro`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/astro)
> and add this package when you pick Cloudflare as the host.

## Install

```bash
pnpm add @czap/cloudflare @czap/astro @astrojs/cloudflare@^14 astro@^7 wrangler@^4
```

Also install the Effect 4 beta peer with `pnpm add effect@beta` — a bare `pnpm add effect` installs 3.x and fails the peer check.

## 30 seconds

```ts
// src/middleware.ts
import { cloudflareMiddleware } from '@czap/cloudflare';
import { boundaries } from 'virtual:czap/boundaries';

export const onRequest = cloudflareMiddleware({
  binding: 'CZAP_BOUNDARY_CACHE',   // KV namespace name in wrangler.jsonc
  manifest: boundaries,
  boundary: 'viewport',             // optional when the manifest has one entry
});
```

Each request now resolves the visitor's device tier and serves that tier's precompiled boundary CSS through `Astro.locals.czap` — `locals.czap.edge.cacheStatus` reads `precompiled` or `hit` once KV is wired. `virtual:czap/boundaries` is the manifest the `@czap/vite` plugin derives at build time: each entry carries the boundary's minted content address (a hash of its definition) plus per-tier outputs, so nothing is hand-typed. For editor types, add `/// <reference types="@czap/vite/virtual" />` to `src/env.d.ts`.

For Astro 7 route-cache invalidation, use `@czap/cloudflare/cache-provider` in `astro.config.mjs` and pass matching `tags` to `cloudflareMiddleware()`. `cache.invalidate({ tags })` then purges the same KV tag index that boundary compile fallbacks write.

Because `cloudflareMiddleware` wraps `@czap/astro`'s `czapMiddleware`, the Workers edge also gets the responsive-media host projection (#140): `Astro.locals.czap.responsiveMedia(intent)` derives Save-Data / DPR caps from the request's Client Hints and projects through `@czap/core`'s `selectCandidates` law, so a Save-Data client on the edge is never advertised a heavy image candidate through `src` / `srcset` / `<source>` / the preload; the responsive `Vary` axis (`Sec-CH-DPR, Save-Data`) is merged into the response. Runnable in `examples/cloudflare-astro`.

## Where it sits

A host adapter — it touches Cloudflare APIs (the `cloudflare:workers` env and KV namespaces) so nothing else has to. It depends on [`@czap/astro`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/astro) for the middleware contract, [`@czap/edge`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/edge) for tier detection and the content-addressed cache, and [`@czap/core`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/core) for the id types. Boundary authoring and compilation live upstream; this package is the Cloudflare glue for middleware, Workers KV, and Astro 7 cache invalidation. See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

A mistyped `binding` emits a CZAP diagnostic, KV reads return null, writes no-op, and every request falls back to the manifest or `compile` path with `cacheStatus: 'miss'`. Check that `binding` matches the KV namespace name in `wrangler.jsonc`, then run `czap doctor --target cloudflare` (from `@czap/cli`) for a preflight of Astro, adapter, and wrangler config.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Cloudflare hosting guide](https://github.com/freebatteryfactory/LiteShip/blob/main/HOSTING.md) — wrangler config, KV setup, deploy
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/cloudflare/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
