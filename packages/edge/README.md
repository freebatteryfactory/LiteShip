# @czap/edge

Detects a visitor's device capability tier from HTTP headers at the server or CDN edge, and caches compiled boundary CSS so the first paint is already adapted.

> You usually don't install this directly — it arrives as a dependency of
> [`@czap/cloudflare`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/cloudflare)
> and [`@czap/astro`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/astro).
> Install one of those instead unless you are writing an adapter for a host
> LiteShip doesn't cover yet.

## Install

```bash
pnpm add @czap/cloudflare   # brings @czap/edge with it
# direct use: pnpm add @czap/edge
```

## 30 seconds

```ts
import { ClientHints, EdgeTier } from '@czap/edge';

export default {
  async fetch(request: Request): Promise<Response> {
    const tier = EdgeTier.detectTier(request.headers);
    const html = `<!doctype html><html ${EdgeTier.tierDataAttributes(tier)}><body>${tier.capLevel}</body></html>`;
    return new Response(html, {
      headers: {
        'content-type': 'text/html',
        'Accept-CH': ClientHints.acceptCHHeader(),
      },
    });
  },
};
```

The served `<html>` element carries `data-czap-tier`, `data-czap-motion`, and `data-czap-design` attributes — the same capability/motion/visual-fidelity triple the browser-side detector would compute, available before any client JavaScript runs.

`ClientHints.responsiveMediaCapabilities(headers)` derives the Save-Data / DPR slice that `@czap/core`'s `selectCandidates` responsive-media law consumes, and `responsiveMediaVaryHeader()` is the `Vary` axis (`Sec-CH-DPR, Save-Data`) a CDN keys those representations on. Both are production-wired through `@czap/astro`'s `czapMiddleware` (and `@czap/cloudflare` through it) as of #140 — a Save-Data client is never advertised a heavy image candidate.

## Where it sits

A host-agnostic edge layer: it only parses headers and strings, touching no platform APIs, which keeps host adapters like `@czap/cloudflare` down to binding glue. It depends on [`@czap/detect`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/detect) (the same pure tier-mapping functions the browser runs, so edge and client agree on tiers) and [`@czap/core`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/core) (shared tier types and branded ids). The KV-backed boundary cache (`createBoundaryCache`) keys entries by the boundary's content address, the device tier, the boundary name, and a fingerprint of the resolved theme — so an entry only serves a request whose inputs match, and editing a boundary mints a new key. (A bundled `compile()` whose output depends on build-time content the boundary id doesn't cover bumps `prefix` to version it.) See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

If every visitor detects as the lowest tier, the browser is not sending `Sec-CH-*` headers — it only does so after a response opts in. Send `Accept-CH: ClientHints.acceptCHHeader()` as above; the very first request still falls back to conservative defaults by design.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Hosting guide](https://github.com/freebatteryfactory/LiteShip/blob/main/HOSTING.md) — per-host wiring, headers, and CSP
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/edge/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
