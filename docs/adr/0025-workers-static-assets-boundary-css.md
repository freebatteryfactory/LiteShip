# ADR-0025 — Workers Static Assets for boundary CSS

**Status:** Accepted
**Date:** 2026-06-26

## Context

LiteShip already precompiles boundary CSS into a build-derived manifest: each
boundary entry carries a deduplicated output pool plus `outputsByTier`, so a
request can resolve `(motionTier, designTier)` to the exact CSS bytes compiled at
build time. Before this decision, those bytes still reached the browser through
the Worker: either a page inlined `Astro.locals.czap.edge.compiledOutputs`, or
`czapFetchLayer()` returned a CSS `Response`.

Cloudflare Workers Static Assets are GA and are routed by Cloudflare's asset
layer before the user Worker when a matching asset path is configured that way.
That gives CZAP a buildable substrate for boundary CSS payloads today without
waiting for the deferred `cacheCloudflare()` CDN provider.

## Decision

When a host opts into `emitBoundaryAssets`, `@czap/vite` emits each distinct
pooled boundary output as an immutable, content-hashed CSS asset under
`/_czap/<boundaryIdShort>/<poolIndex>.<hash>.css` and adds optional
`assetUrls` to the boundary manifest. Edge resolution maps the resolved tier to
the output pool index and reports the selected URL alongside the existing
`CompiledOutputs`; rendering chooses `<link rel="stylesheet" href={assetUrl}>`
when present and falls back to the existing inline / Worker-served path when it
is absent.

## Consequences

- Serve precompiled boundary CSS as immutable, content-hashed Workers Static
  Assets so the CSS bytes are delivered by Cloudflare's static-asset layer
  instead of being inlined/emitted by the Worker on every request.
- This skips the Worker for the CSS payload, not the invocation. The Worker
  still runs to SSR the page and resolve the tier; it emits a `<link href>` to a
  hashed asset instead of inlining the CSS.
- This is strictly weaker than the deferred `cacheCloudflare()` CDN provider:
  that future provider can skip the function entirely on cache hits. Static
  Assets are GA and buildable today, so this PR deliberately ships the smaller
  substrate first.
- URLs are content-hashed. Long-lived immutable caching is safe only because no
  stable URL is assigned to mutable CSS bytes.
- Theme CSS remains inline. Theme is a request-time axis and is deliberately not
  baked into default static assets.
- ADR-0017's KV identity stays unchanged: asset URLs are manifest metadata, not
  cache keys.

## Evidence

- `packages/edge/src/manifest.ts` — optional `assetUrls` and
  `resolveAssetUrlByTier`.
- `packages/vite/src/plugin.ts` — Rollup asset emission, URL-token wiring, and
  manifest JSON emission.
- `packages/edge/src/host-adapter.ts` — request resolution reports `assetUrl`
  without altering KV lookup identity.
- `examples/cloudflare-astro/wrangler.jsonc` — `run_worker_first` routes pages
  through the Worker while sending `/_czap/*` to the asset worker.
- `tests/unit/vite/boundary-assets.test.ts` — real Vite build proving hashed
  `_czap` CSS assets and manifest URLs.

## Rejected alternatives

- **Claim this skips the Worker.** False: the page request still invokes the
  Worker for SSR and tier resolution. Only the CSS asset request bypasses it.
- **Client-side CSS swap.** Causes a flash and moves tier selection after first
  paint.
- **Edge redirect to the asset.** Still requires the Worker and is less portable
  than SSR-baked `<link>` selection.
- **Bake theme variants by default.** Multiplies asset count across a
  request-time axis and reopens stale-URL risk unless every theme input is part
  of the asset identity.
- **Build against `cacheCloudflare()` now.** That provider remains deferred
  until Cloudflare's Worker-skip cache surface is stable enough to support
  without private-beta assumptions.

## References

- [ADR-0017](./0017-cache-content-version.md) — cache identity and active
  invalidation invariants.
- [ADR-0024](./0024-fetch-layer-edge-adaptation.md) — the Worker-served CSS
  layer this complements.
- Cloudflare Workers Static Assets docs:
  <https://developers.cloudflare.com/workers/static-assets/>.
- Cloudflare Worker-first routing docs:
  <https://developers.cloudflare.com/workers/static-assets/routing/worker-script/>.
