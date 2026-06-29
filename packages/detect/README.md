# @czap/detect

Probes browser APIs — GPU, CPU cores, memory, motion and color preferences, viewport, network — and maps the results to the capability tiers the rest of LiteShip uses to gate output.

> You usually don't install this directly — it arrives as a dependency of [@czap/astro](https://www.npmjs.com/package/@czap/astro), which runs detection for you in the client runtime. Install `@czap/astro` instead unless you need the capability probes standalone.

## Install

```bash
pnpm add @czap/astro # brings @czap/detect with it
```

If you do install it directly, `effect` must be the Effect 4 beta: `pnpm add @czap/detect effect@beta`.

## 30 seconds

```ts
import { Detect } from '@czap/detect';
import { Effect } from 'effect';

const result = Effect.runSync(Detect.detect());
console.log(result.tier);       // 'static' | 'styled' | 'reactive' | 'animated' | 'gpu'
console.log(result.motionTier); // 'none' | 'transitions' | 'animations' | 'physics' | 'compute'
console.log(result.confidence); // 0.5–1.0 — low means probes fell back to defaults
```

In a browser this logs the device's capability level, its motion tier (reduced-motion preference forces `'none'`), and a confidence score. All probes are synchronous and never throw — `Effect.runSync` is safe here. `Detect.watchCapabilities(onChange)` re-detects on viewport and preference changes.

## Where it sits

This package is host-adjacent — it touches browser APIs so nothing else has to. Its only `@czap` dependency is `@czap/core`, for the `CapLevel` and `MotionTier` types it maps detected hardware onto. What to *do* at each tier is decided elsewhere: `@czap/quantizer` gates outputs by motion tier, and `@czap/astro` applies detection during hydration. It also exports the capability-attribute vocabulary — `CAP_AXES` / `capAxisAttr` for the `tier`/`motion`/`design` axes — the single source `@czap/edge` and the client runtime project to `data-czap-*` attributes, so the emitted attribute name and the locals field name can't drift. See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

Detection never throws; outside a browser (SSR, Node tests) every probe falls back, and you get mid-range defaults that look plausible. If results are identical across wildly different devices, check `result.confidence` — a low value means the probes fell back rather than measured. Run detection on the client.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Authoring model](https://github.com/freebatteryfactory/LiteShip/blob/main/AUTHORING-MODEL.md) — authoring for tiers, including reduced motion
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/detect/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
