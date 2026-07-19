# @liteship/astro

Astro 7 integration that compiles your boundary definitions at build time and activates their state evaluators on the client.

> Install this directly when your site is built on Astro 7 — this is the
> integration most LiteShip projects install first. The other `@liteship/*`
> runtime packages arrive with it.

## Install

```bash
pnpm add @liteship/astro @liteship/core
```

## 30 seconds

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { integration as liteship } from '@liteship/astro';

export default defineConfig({ integrations: [liteship()] });

// src/boundaries.ts — a boundary names where one state becomes the next
import { Boundary } from '@liteship/core';

export const viewport = Boundary.make({
  input: 'viewport.width',
  at: [[0, 'stacked'], [768, 'split']],
  hysteresis: 20, // 20px of grace so the state doesn't flicker
});
```

```astro
---
// src/pages/index.astro
import Satellite from '@liteship/astro/Satellite';
import { viewport } from '../boundaries.js';
---
<Satellite boundary={viewport}>
  <section>Resize the window.</section>
</Satellite>
```

Drag the window edge across 768px: the wrapper's `data-liteship-state` attribute flips between `stacked` and `split` for your CSS to key on. No `client:*` attribute needed — the integration's injected boot script activates the evaluator.

`liteship({ middleware: true })` auto-wires capability detection, so the common case needs no `src/middleware.ts`; it populates a typed `Astro.locals.liteship.tiers.{tier,motion,design}` (no cast). Astro 7 hosts that need LiteShip before Astro's page pipeline can use `liteshipFetchLayer()` from `@liteship/astro/fetch-layer`. Boundaries can also bind live `audio.amplitude` / `audio.beat` signals (`driveAudioFromAnalyser` from `@liteship/astro/runtime`), and the dev boundary inspector ships as an Astro dev-toolbar app (toggle from the toolbar icon).

Continuous authored motion has a production runtime: `liteship({ motion: { enabled: true } })` registers `client:motion`, the JS **FLOOR** for the scroll-scrubbed reveal. Native `animation-timeline` CSS (from `MotionCompiler`) owns the scrub where supported; everywhere it is not, `client:motion` reads the SSR-inlined lowered program off `data-liteship-motion-program` and drives `writeContinuousMap` every frame — sampling the SAME `Easing.spring` the native `linear()` compiled from, so the two paths render one identical curve. The continuous tween is a leaf write (never a graph patch); `prefers-reduced-motion` with a `settle` policy pins the final pose with no tween. Runnable in `examples/showcase` at `/motion`.

Responsive media adapts at the host: `Astro.locals.liteship.responsiveMedia(intent)` derives Save-Data / DPR caps from the request's Client Hints and projects a `ResponsiveMedia.intent` through the ONE effective-candidate law (`selectCandidates` in `@liteship/core`). Every artifact — `src`, `srcset`, each `<source>`, the preload `imagesrcset` — derives from that set, so under `Save-Data` the whole picture is capped to the light asset and a high-DPR client can never re-fetch the heavy hero. The middleware also merges the responsive `Vary` axis (`Sec-CH-DPR, Save-Data`) into the response so a CDN keys the two representations apart. `projectResponsiveMediaForRequest` / `applyResponsiveMediaVary` are the standalone route-handler helpers. Runnable in `examples/showcase` at `/responsive-media` (and `examples/cloudflare-astro` on the Workers edge).

## Where it sits

The host integration most apps touch: it registers [`@liteship/vite`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/vite) (build-time boundary scanning and CSS), injects [`@liteship/detect`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/detect)'s device-tier probe, and rigs the client directives backed by [`@liteship/web`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/web) (DOM morphing, SSE, LLM streams) and [`@liteship/worker`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/worker) (off-thread evaluation), with [`@liteship/edge`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/edge) supplying SSR tier detection for the optional middleware. Boundary authoring itself lives in [`@liteship/core`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/core); Cloudflare deploys add [`@liteship/cloudflare`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/cloudflare) on top. See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

If `data-liteship-state` never changes on resize, the boot script was never injected — confirm `liteship()` is in `integrations` in `astro.config.mjs`. Astro's own `client:visible` / `client:idle` directives do not wire the evaluator; `Satellite` (or `satelliteAttrs(...)` spread onto any element) emits the `data-liteship-directive="satellite"` marker the boot scanner looks for.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [LiteShip for Astro static sites](https://github.com/freebatteryfactory/LiteShip/blob/main/ASTRO-STATIC-MENTAL-MODEL.md) — the authoring mental model
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/astro/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
