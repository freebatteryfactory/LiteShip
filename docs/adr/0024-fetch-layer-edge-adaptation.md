# ADR-0024 — Fetch layer: request-time adaptation in front of Astro

**Status:** Accepted
**Date:** 2026-06-25

## Context

LiteShip's thesis is request-time adaptive rendering: resolve a request's capability tier + theme at the edge, then serve the boundary CSS that matches. Until now that resolution ran through `czapMiddleware` — an Astro `pre` middleware that ALWAYS calls `next()` ([`middleware.ts`](../../packages/astro/src/middleware.ts) injects `context.locals.czap`, continues, then decorates response headers). Two structural limits follow from "inside the pipeline, always continue": adaptation can only act AFTER Astro has decided to handle the request, and it can never respond INSTEAD of invoking Astro — even when the entire response is precompiled boundary CSS the edge already holds. The thesis was, mechanically, a middleware bolted onto Astro.

Astro 7's advanced routing (`src/fetch.ts` + `astro/fetch`) opens a seam in FRONT of the page pipeline: a `Fetchable` (`{ fetch(request): Response }`) composed from `FetchState`-based layers (`astro(state)`, `middleware(state, next)`, `i18n`, …), Hono-compatible by `astro/hono`. That is exactly the seam the thesis needs.

## Decision

Add `czapFetchLayer(config)` — a framework-agnostic `(request, next) => Promise<Response>` layer that calls the **same** `createEdgeHostAdapter().resolve()` the middleware does. One resolution implementation, two presentation shells. It adds NO cache code: it only consumes the `EdgeHostResolution`, so [ADR-0017](./0017-cache-content-version.md)'s key composition and identity invariants hold by construction, not by re-implementation. On an opt-in `serveFromEdge` predicate it serves the serialized boundary CSS straight from the edge and returns WITHOUT `next()` — Astro is skipped on the most frequent adaptive responses; otherwise it runs the downstream (Astro) and decorates the Client-Hints / COOP-COEP headers exactly as the middleware does. `CzapFetchLayerConfig extends CzapMiddlewareConfig`, so a consumer migrates by swapping the factory, not relearning config; `czapMiddleware` stays the zero-config default for Astro pages.

## Consequences

- Request-time adaptation stops being a middleware bolted onto Astro and becomes a routing LAYER in front of it: tier detection is an explicit upstream layer (orderable before i18n), and the precompiled-CSS path returns a response without ever waking the renderer.
- The edge-serve path in 0.4.0 skips **Astro**, not the **Worker** — `cacheCloudflare()` (an edge cache that skips the Worker function entirely) is the later payoff this enables, deliberately out of scope here.
- The boundary-CSS serialization (`serializeBoundaryCss`) is exposed and tested directly — theme `:root` → `@property` registrations → `@container` queries → boundary CSS, the CSS-correct order — so the edge-served form is not a hidden mirror of the page's inlining.
- Resolution PARITY with `czapMiddleware` (same response headers for the same request) is a test, so the "one resolution, two shells" claim is enforced, not asserted.
- Honest scope: the layer is unit-proven and composes against Astro 7's real exported `Fetchable` type; the full `astro/fetch` ordered composition wired through a running SSR example, and the Worker-skip cache, are deferred.

## Evidence

- `packages/astro/src/fetch-layer.ts` — `czapFetchLayer`, the edge-serve/pass-through split, `serializeBoundaryCss`.
- `packages/edge/src/host-adapter.ts` — the pure `resolve(headers): Promise<EdgeHostResolution>` both shells share (zero Astro coupling).
- `tests/unit/astro/fetch-layer.test.ts` — serializer order, edge-serve skip (`next` never called), pass-through header decoration, resolution parity with the middleware, the `satisfies Fetchable` composition against astro's type.

## Rejected alternatives

- **Keep only the middleware.** A `pre` middleware structurally cannot return a response instead of invoking Astro — serving from the edge is impossible from inside the pipeline.
- **Give the layer its own cache lookup / key.** Re-implements ADR-0017's key composition and reopens the stale-cache class; the layer MUST route through the shared `resolve()`.
- **A Hono-only middleware.** Couples the adaptation to Hono; the `(request, next)` shape composes with `astro/fetch`, Hono, Bun, Deno, and Workers alike, and Astro's own `astro/hono` uses the same shape.

## References

- [ADR-0017](./0017-cache-content-version.md) — the cache invariants the layer preserves by sharing `resolve()` (active invalidation amended there, 0.4.0).
- `PACKAGE-SURFACES.md` `@czap/astro`; `HOSTING.md` §Cloudflare Workers.
