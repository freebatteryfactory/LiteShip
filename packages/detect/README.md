# @liteship/detect

Probes browser APIs — GPU, CPU cores, memory, motion and color preferences, viewport, network — and maps the results to the capability tiers the rest of LiteShip uses to gate output.

> You usually don't install this directly — it arrives as a dependency of [@liteship/astro](https://www.npmjs.com/package/@liteship/astro), which runs detection for you in the client runtime. Install `@liteship/astro` instead unless you need the capability probes standalone.

## Install

```bash
pnpm add @liteship/astro # brings @liteship/detect with it
```

If you do install it directly: `pnpm add @liteship/detect`.

## 30 seconds

```ts
import { Detect, requireObserved } from '@liteship/detect';

const result = Detect.detect();
console.log(result.capTier); // 'static' | 'styled' | 'reactive' | 'animated' | 'gpu'
console.log(result.motionTier); // 'none' | 'transitions' | 'animations' | 'physics' | 'compute'
console.log(result.tierEvidence.motion.support); // 'observed' | 'inferred'

const measuredMotion =
  result.tierEvidence.motion.support === 'observed'
    ? requireObserved(result.tierEvidence, ['motion']).motion
    : undefined; // keep the conservative render value; do not claim it was measured
```

In a browser this logs the device's capability level, its motion tier (reduced-motion preference forces `'none'`), and whether every input behind that motion decision was observed. Complete conservative values are always present; `tierEvidence` says which axes still depend on fallbacks. All probes are synchronous and never throw. `Detect.watchCapabilities(onChange)` re-detects on viewport and preference changes. Use `requireObserved(result.tierEvidence, ['motion'])` before making a claim that requires measured motion capability rather than a safe initial value.

## Where it sits

This package is host-adjacent — it touches browser APIs so nothing else has to. It depends on `@liteship/core` for the `CapTier` and `MotionTier` types it maps detected hardware onto, and on the leaf `@liteship/error` algebra for fail-closed evidence admission. What to _do_ at each tier is decided elsewhere: `@liteship/quantizer` gates outputs by motion tier, and `@liteship/astro` applies detection during hydration. It also exports the capability-attribute vocabulary — `CAP_AXES` / `capAxisAttr` for the `tier`/`motion`/`design` axes — the single source `@liteship/edge` and the client runtime project to `data-liteship-*` attributes, so the emitted attribute name and the locals field name can't drift. See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

Detection never throws; outside a browser (SSR, Node tests) every probe falls back, and you get complete conservative defaults. Inspect `result.tierEvidence`: each axis is `observed` only when every primitive that shapes that axis was measured, and every inferred input names its fallback source. Run detection on the client when a trust-bearing decision requires `requireObserved(...)` to pass.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Authoring model](https://github.com/freebatteryfactory/LiteShip/blob/main/AUTHORING-MODEL.md) — authoring for tiers, including reduced motion
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/detect/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
