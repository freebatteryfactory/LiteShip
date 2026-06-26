# @czap/astro

Astro 7 integration that compiles your boundary definitions at build time and activates their state evaluators on the client.

> Install this directly when your site is built on Astro 7 — this is the
> integration most LiteShip projects install first. The other `@czap/*`
> runtime packages arrive with it.

## Install

```bash
pnpm add @czap/astro @czap/core effect@beta
```

`effect` must be the Effect 4 beta (`effect@beta`) — a bare `pnpm add effect` installs 3.x and fails the peer check.

## 30 seconds

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { integration as czap } from '@czap/astro';

export default defineConfig({ integrations: [czap()] });

// src/boundaries.ts — a boundary names where one state becomes the next
import { Boundary } from '@czap/core';

export const viewport = Boundary.make({
  input: 'viewport.width',
  at: [[0, 'stacked'], [768, 'split']],
  hysteresis: 20, // 20px of grace so the state doesn't flicker
});
```

```astro
---
// src/pages/index.astro
import Satellite from '@czap/astro/Satellite';
import { viewport } from '../boundaries.js';
---
<Satellite boundary={viewport}>
  <section>Resize the window.</section>
</Satellite>
```

Drag the window edge across 768px: the wrapper's `data-czap-state` attribute flips between `stacked` and `split` for your CSS to key on. No `client:*` attribute needed — the integration's injected boot script activates the evaluator.

`czap({ middleware: true })` auto-wires capability detection, so the common case needs no `src/middleware.ts`; it populates a typed `Astro.locals.czap.tiers.{tier,motion,design}` (no cast). Astro 7 hosts that need CZAP before Astro's page pipeline can use `czapFetchLayer()` from `@czap/astro/fetch-layer`. Boundaries can also bind live `audio.amplitude` / `audio.beat` signals (`driveAudioFromAnalyser` from `@czap/astro/runtime`), and the dev boundary inspector ships as an Astro dev-toolbar app (toggle from the toolbar icon).

## Where it sits

The host integration most apps touch: it registers [`@czap/vite`](https://github.com/heyoub/LiteShip/tree/main/packages/vite) (build-time boundary scanning and CSS), injects [`@czap/detect`](https://github.com/heyoub/LiteShip/tree/main/packages/detect)'s device-tier probe, and rigs the client directives backed by [`@czap/web`](https://github.com/heyoub/LiteShip/tree/main/packages/web) (DOM morphing, SSE, LLM streams) and [`@czap/worker`](https://github.com/heyoub/LiteShip/tree/main/packages/worker) (off-thread evaluation), with [`@czap/edge`](https://github.com/heyoub/LiteShip/tree/main/packages/edge) supplying SSR tier detection for the optional middleware. Boundary authoring itself lives in [`@czap/core`](https://github.com/heyoub/LiteShip/tree/main/packages/core); Cloudflare deploys add [`@czap/cloudflare`](https://github.com/heyoub/LiteShip/tree/main/packages/cloudflare) on top. See the
[package surfaces map](https://github.com/heyoub/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

If `data-czap-state` never changes on resize, the boot script was never injected — confirm `czap()` is in `integrations` in `astro.config.mjs`. Astro's own `client:visible` / `client:idle` directives do not wire the evaluator; `Satellite` (or `satelliteAttrs(...)` spread onto any element) emits the `data-czap-directive="satellite"` marker the boot scanner looks for.

## Docs

- [Getting started](https://github.com/heyoub/LiteShip/blob/main/GETTING-STARTED.md)
- [LiteShip for Astro static sites](https://github.com/heyoub/LiteShip/blob/main/ASTRO-STATIC-MENTAL-MODEL.md) — the authoring mental model
- [Glossary](https://github.com/heyoub/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/astro/src/) — generated from source

---

Part of [LiteShip](https://github.com/heyoub/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
