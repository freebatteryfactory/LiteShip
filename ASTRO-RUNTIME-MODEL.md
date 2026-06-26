# LiteShip in Astro

## Purpose

How LiteShip sits inside an Astro site: where the document host ends and the CZAP runtime begins. Imports stay on `@czap/*`; export names like `czapMiddleware()` stay literal.

Naming: [GLOSSARY.md](./GLOSSARY.md).

This is not a routing guide and not a content-model guide. It is about runtime responsibility.

---

## The division of labor

Astro should own:

- document structure
- HTML delivery
- server rendering
- content composition

LiteShip should own:

- adaptive state logic
- capability-aware escalation
- authored visual state outputs
- media, worker, and shader runtime behavior where needed

---

## The main Astro surfaces

The public Astro package surface is in [`packages/astro/src/index.ts`](./packages/astro/src/index.ts).

The important exports are:

- `integration`
- `resolveInitialState`
- `satelliteAttrs`
- `resolveInitialStateFallback`
- `czapMiddleware`
- `czapFetchLayer`

These form the Astro host layer.

---

## Integration

`integration()` is the Astro integration entry point: the host-level hook that registers transforms and rigs detection alongside Astro's lifecycle.

It is responsible for:

- registering the Vite plugin path that understands authored `@token` / `@theme` / `@style` / `@quantize` transforms
- rigging client-side detection support
- connecting Astro lifecycle behavior to LiteShip's assumptions

Use it when the site itself is a LiteShip-aware Astro host.

### Defaults (0.2.0 ergonomics)

`integration()` runs with batteries included — most surfaces need no config:

- **on by default:** `detect`, `stream`, `llm`, `gpu`, and the dev `inspector` (an Astro dev-toolbar app in `astro dev`).
- **opt-in:** `workers` (`workers: { enabled: true }` — only the `client:worker` directive needs it) and `wasm`.
- **auto-resolved:** initial state defaults from the server-resolved bearing, and the `czap-compute` WASM artifact — shipped inside `@czap/core` (0.2.1+) — resolves itself from `node_modules`; you don't thread either by hand.

So `integration()` with no arguments is the right call for a static-first site; reach into the config object only to turn something off (`{ gpu: { enabled: false } }`, `{ inspector: false }`) or to opt `workers`/`wasm` in. Don't re-enable what's already on.

**Scoping czap off some routes (0.2.2+):** when czap shares a site with another Astro sub-app — say a Starlight `/docs` section — pass `exclude` so czap's costly scripts (detect, the GPU probe, wasm, inspector) don't run there: `czap({ exclude: ['/docs/**'] })`. Astro's `injectScript` is global (no build-time route filter), so this is a runtime guard — a head-inline script, injected first, sets `window.__CZAP_OFF__` from `location.pathname` (re-evaluating on View-Transition swaps) and those scripts short-circuit on it. The directive bootstrap stays wired (a no-op without czap markers) so View Transitions keep working across the boundary. Matches exact paths and a trailing `**` (`/docs/**` covers `/docs` and under it; `/documentation` is not matched). Default `[]`.

---

## Middleware

`czapMiddleware()` is the request-time bridge.

Its job is to let the server side understand request and capability context well enough to emit a sensible initial result.

The important idea is:

- first paint should already reflect a good state guess
- client runtime should refine or continue, not invent the experience from nothing

For static visual sites, this keeps the document legible and intentional before client work begins.

`czap({ middleware: true })` auto-wires this detection middleware (`@czap/astro/middleware-entry`), so the common case needs no hand-written `src/middleware.ts`. It populates a typed `Astro.locals.czap` — `{ tiers: { tier, motion, design }, capabilities, edge? }`, augmented onto `App.Locals` — so `Astro.locals.czap.tiers.tier` reads without a cast. The edge boundary cache (whose `theme`/`compile` carry functions) can be wired through a consumer `src/middleware.ts` calling `czapMiddleware({ edge })`, or through Astro 7's fetch pipeline via `czapFetchLayer({ edge })`.

## Fetch layer

`czapFetchLayer()` is the Astro 7 request-pipeline form of the same edge resolution model. It calls the same `createEdgeHostAdapter().resolve(headers)` path as `czapMiddleware()`, but can sit in `src/fetch.ts` before Astro's own `cache`, `middleware`, and `astro` handlers. On the hot path it can return compiled boundary CSS directly and skip the rest of the pipeline; otherwise it annotates the request/locals and lets Astro continue.

Use it when the host wants CZAP adaptation before Astro's route cache, i18n, middleware, or page rendering layers. Keep the invariant: no parallel cache key logic in `src/fetch.ts`; the fetch layer consumes the shared edge resolution result.

## Astro cache bridge

Astro 7's route cache and CZAP's boundary cache share invalidation through `@czap/cloudflare/cache-provider` plus `cloudflareMiddleware({ tags })`. Put the same tag names in Astro `routeRules.tags` and the CZAP middleware `tags` config; compile fallback writes those tags into the KV index, and `cache.invalidate({ tags })` purges all tier/theme variants for the boundary entries carrying that tag. For path invalidation, the provider also uses Astro's `astro-path:/route` tag convention and can map exact paths to boundary ids with `pathBoundaries`.

---

## Initial state

`resolveInitialState()` and `resolveInitialStateFallback()` exist because a surface should not begin life as an empty runtime shell.

The server can often choose a useful initial state from:

- request context
- known defaults
- capability hints
- authored fallback rules

This is one of the strongest reasons to pair LiteShip with Astro. Initial state can be resolved server-side from those signals; the client doesn't begin from an empty shell.

---

## Satellite attributes

`satelliteAttrs()` expresses the shell contract that client directives and runtime code understand.

This matters because LiteShip runtime behavior is DOM-and-attribute based. The shell is not a virtual tree abstraction. It is real HTML with semantic `data-czap-*` meaning attached.

That keeps Astro in its strongest mode:

- declarative HTML
- explicit enhancement
- small client runtime surface

---

## Client directives

The Astro client-directive layer currently includes important runtime surfaces:

- `satellite`
- `stream`
- `llm`
- `gpu`
- `worker`
- `wasm`

These are not interchangeable. They represent different escalation levels.

### `satellite`

Use when a surface needs adaptive state tracking tied to authored boundaries.

The shape of an authored Astro page using LiteShip is small. Boundaries are imported as plain TypeScript values; the `Satellite` shell wraps the markup the boundary should drive and serializes a `data-czap-directive` marker that the integration's injected boot scanner activates on the client. Static HTML and compiled CSS carry the rest.

```astro
---
// src/pages/index.astro
import Satellite from '@czap/astro/Satellite';
import { heroLayout } from '../boundaries.js';
---

<Satellite boundary={heroLayout}>
  <section class="hero">
    <h1>The hull is in the water.</h1>
    <p>Drag the window edge; the layout re-trims at the named bearings.</p>
  </section>
</Satellite>
```

How activation works: Astro fires custom `client:*` directives only on framework-component islands, never on plain elements or `.astro` components — czap's island primitive is a plain annotated div. So the integration injects a per-page boot scanner that activates `data-czap-directive="<name>"` markers (and, for back-compat, literal `client:satellite`-style attributes on plain elements), loading the same code-split directive chunk Astro's island path would. On framework components, the registered `client:*` directives still apply natively.

The corresponding `boundaries.js` is plain TypeScript:

```ts
// src/boundaries.ts
import { Boundary } from '@czap/core';

export const heroLayout = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'stacked'],
    [760, 'split'],
    [1180, 'cinematic'],
  ],
  hysteresis: 40,
});
```

And the compiled CSS the Vite plugin emits for `.hero` (from a paired `Style.make({...})` definition) looks like:

```css
.hero {
  display: grid;
  gap: var(--czap-space-section);
}
[data-czap-state='stacked'] .hero {
  grid-template-columns: 1fr;
}
[data-czap-state='split'] .hero {
  grid-template-columns: 1.1fr 0.9fr;
}
[data-czap-state='cinematic'] .hero {
  grid-template-columns: 1.2fr 0.8fr;
  min-height: 80vh;
}
```

The directive's only runtime job is to evaluate `heroLayout` against the live viewport and write the resolved state to the satellite's `data-czap-state` attribute; the CSS attribute selectors do the visible work without round-tripping through JavaScript.

For request-time SSR you can resolve an initial state on the server so first paint already reflects the right bearing:

```ts
// src/middleware.ts
import { resolveInitialState } from '@czap/astro';
import { heroLayout } from './boundaries.js';

export const onRequest = async (context, next) => {
  const initial = resolveInitialState(heroLayout, context.request);
  context.locals.heroState = initial;
  return next();
};
```

The shell then renders with the resolved state baked into `data-czap-state`; the client directive picks up where the server left off, no flash on hydration.

### `stream`

Use when server-originated streamed content becomes part of the visual surface.

### `llm`

Use when generative content is part of the presentation system.

### `gpu`

Use when the visual meaning depends on shader execution, not merely decoration. The directive defers below the GPU perf-tier — but the probe runs async, so a capable device starts on the conservative provisional tier; the directive **re-boots automatically when the probe settles a GPU-admitting tier** (it listens for `czap:detect-ready`), so the common capable-GPU case needs no intervention. `client:gpu={{ force: true }}` (or a `data-czap-gpu-force` attribute) skips the gate entirely — for headless/CI (SwiftShader reports tier 0 yet WebGL2 works) and genuinely-low-but-capable devices that never upgrade. The real WebGL2/WebGPU probe still gates it, so a missing context degrades to CSS, never a crash. Authored `@glsl`/`@wgsl` boundaries get their uniform **declarations delivered automatically** — the compiler's emitted `.declarations` are prepended to the shader at runtime, so you reference `u_*` uniforms without hand-declaring them; the runtime's uniform vocabulary is the compiler's, never a hand-typed mirror.

### `worker`

Use when off-main-thread coordination is part of the surface's runtime need.

### `wasm`

Use when compute cost meaningfully exceeds what the normal runtime should carry. The `czap-compute` kernel ships inside `@czap/core` (0.2.1+) and `@czap/vite` resolves it from `node_modules`, so enabling `wasm` needs no hand-built artifact (monorepo dev: `pnpm run build:wasm`). `czap({ wasm: { enabled: true } })` auto-loads the kernel at the document level (0.2.2+) and fires `czap:wasm-ready` — no per-element `client:wasm` directive required (that directive still works for element-scoped loads). Worth noting: every directive past `satellite` is additive. The surface should still be coherent if `wasm` doesn't load and the worker falls back to TypeScript kernels (`packages/core/src/wasm-fallback.ts`). The escalation path is a budget, not a dependency.

### `graph`

Use when the adaptive surface is authored as a serialized `DocumentGraph` rather than inline `@boundary` annotations — a host hands the runtime a sealed graph and it lowers onto the **same** live cast pipeline the satellite path uses. `loadGraphRuntime(serialized, resolve)` re-seals the graph (never trusting a supplied id), projects each entity/component into a `RuntimeBoundary` (the one evaluator + CSS/ARIA/GPU casts), and wires the signal observers; `data-czap-graph` carries the payload. A mutation rides a `GraphPatch` through `castGraphDelta` — only the changed cells re-lower, so untouched observers survive (no full re-seed flash). The loader is the seam an authoring producer feeds; the producer that serializes/authors the graph is a downstream concern, never named here. Two companions ride the same runtime: `bridgeSceneToGraph(scene, handle, …)` drives the graph from a signal-indexed `@czap/scene` (a discrete state crossing emits a `GraphPatch` → re-cast; the continuous tween writes a leaf CSS var / GPU uniform each frame and **never** patches the graph), and the AI-apply seam (`castGraphContext` casts the live graph OUT to a model-facing context; `admitGraphPatchProposal` admits a candidate IN through the un-bypassable validate→apply token chain, then re-casts the delta).

### `svg`

Use when a `<svg>` entity's presentation (transform, opacity, blend, clip) must track a signal live, not only at first paint. The directive resolves `data-czap-entity → SVGElement` and applies `@czap/scene`'s `applySvgAttrs` each frame — the live last-mile of the SVG cast arm (the same egress the offline scene render uses, now driven on the live DOM).

---

## Runtime escalation in Astro

The correct Astro posture is:

1. emit real HTML
2. let CSS carry as much as possible
3. attach LiteShip runtime only where authored behavior needs it
4. escalate to worker, gpu, or wasm only where meaning requires it

Astro gives the page a strong server-rendered base. LiteShip adds stateful adaptive behavior without forcing every surface into a general-purpose app runtime.

---

## Capability ceilings

A key LiteShip invariant is that authored intent degrades gracefully under capability ceilings: every surface starts at the cheapest projection that is still valid and escalates to a richer one only when the capability and frame budget allow — the *cheapest-valid-default* discipline. A boundary that can't reach the GPU still renders correct CSS; a worker that can't load WASM falls back to the TypeScript kernels. ([ADR-0002](./docs/adr/0002-zero-alloc.md) has the full rationale.)

Inside Astro, that means:

- the document should remain coherent without rich runtime
- richer directives should be additive, not required for baseline meaning
- surfaces should preserve narrative and hierarchy even when the runtime is reduced

This makes the system suitable for static visual websites rather than only for full client apps.

---

## Capability detection

The integration writes a provisional `data-czap-tier` inline in `<head>`, then an async probe (GPU renderer, WebGPU, cores/memory, reduced-motion) settles the real tier after load. When it finishes — `__CZAP_DETECT__` and the `data-czap-*` attributes final — it fires one `czap:detect-ready` event on `document` carrying `{ tier, gpuTier, webgpu, motionTier }` (or `{ error: true }` if the probe threw). Listen for that one event instead of polling `__CZAP_DETECT__` or racing a `setTimeout` backstop; it is the single signal that detection has settled. The `client:gpu` directive consumes it internally to re-boot after a tier upgrade (above). `gpuTier` and `webgpu` are carried only on the `czap:detect-ready` detail and `window.__CZAP_DETECT__` — never as `<html>` attributes (they're engine state, not author-facing CSS keys).

Attribute note: `data-czap-motion` is the motion capability **tier** (`animations`/`transitions`/`physics`/`compute`/`none`) — emitted server-side by `EdgeTier.tierDataAttributes` and written client-side by the async probe when it settles (so it's present on non-edge pages too, and the edge value gets refined by the real GPU probe). The reduced-motion **preference** is a separate `data-czap-reduced-motion` (`reduce`/`no-preference`); the two used to collide on one attribute.

---

## The rendering sequence

The ideal sequence is:

1. Astro renders the document
2. server-side context resolves a sensible initial state
3. shell attributes encode authored meaning into DOM
4. CSS and compiled outputs express the cheapest valid surface
5. client directives refine or continue the experience where needed
6. richer runtimes take over only where they add real value

Following that order keeps server-rendered HTML the baseline and limits client runtime to surfaces that actually need it. If everything assumes maximum runtime from the start, the server-rendered base is doing less work than it could.

---

## Working definition

Inside Astro, LiteShip should be understood as:

> an adaptive authored runtime layered on top of an HTML-first document host.
