# @liteship/core

Creates the definitions — boundaries (named states over a numeric signal), design tokens, styles, themes — that the rest of LiteShip compiles to CSS and evaluates at runtime.

> Install this directly when you want the definition primitives without a framework integration. If you're starting a new project, start with [liteship](https://www.npmjs.com/package/liteship) or [@liteship/astro](https://www.npmjs.com/package/@liteship/astro) instead. Full ladder: [GETTING-STARTED.md](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md).

## Install

```bash
pnpm add @liteship/core
```

`@liteship/core` has no third-party runtime peer dependency — the `effect` peer was shed in v0.18.

## 30 seconds

```ts
import { Boundary, defineBoundary } from '@liteship/core';

const viewport = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1280, 'desktop'],
  ],
  hysteresis: 20,
});

console.log(Boundary.evaluate(viewport, 800)); // 'tablet'
console.log(viewport.id); // 'fnv1a:bf4e9a2f'
```

Logs `tablet` (800 sits between the 768 and 1280 thresholds), then the boundary's content address — the same address on every machine, because it is computed from the definition itself. The `hysteresis: 20` is a dead zone that stops state flicker right at a threshold.

## Where it sits

This is the foundation layer — every other `@liteship/*` package imports its primitives. Its LiteShip dependency edge points only downward to `@liteship/_spine` declarations, `@liteship/canonical` bytes/digests, and the `@liteship/error` algebra. Two things commonly assumed to be here live elsewhere: live evaluation against a changing signal is `@liteship/quantizer`, and compiling definitions to CSS text is `@liteship/compiler`.

Core owns the canonical signal-input vocabulary: `SignalSource` ⇄ `SignalInput` via `sourceToInput`/`inputToSource` — the source of truth for input strings like `viewport.width`, `scroll.progress`, and `audio.amplitude` that every host reads through rather than re-parsing.

It also owns the **one motion kernel** both floors share. `TransitionProgram` is authored composition; `TransitionTimeline` is the deterministic schedule returned by `lowerTransitionProgram`; `RuntimeWritePlan` is the admitted executable leaf-write plan consumed by `sampleProgram`. `interpolateTyped` handles every `TypedValue` within-kind and refuses cross-space color interpolation loudly. The native CSS path and the JS runtime floor therefore read one easing/window kernel, never a fork.

`FrameSchedule` is the same law on the offline timing axis: `createFrameSchedule` owns frame count, index, timestamp, and normalized progress, while `createVideoRenderer` projects compositor state over those coordinates. Remotion and Stage adapt the schedule instead of owning competing frame math.

The low-level ECS machinery is deliberately not on the ordinary root. Import `@liteship/core/ecs` for minted `Part<T>` identities, `admitPart`, declared systems, typed worlds, and Part-owned dense writers. Scene is the primary frame-driven consumer; the document graph remains the sealed/replayable state authority.

Core owns the **one responsive-media effective-candidate law** too: `selectCandidates(intent, caps)` returns the `ResponsiveMediaCandidateSet` every output derives from — `resolveResponsiveMedia`'s `src`, `projectResponsiveMediaPicture`'s `srcset` / `<source>` / preload `imagesrcset`, and `@liteship/compiler`'s `image-set()` + cache-key digest. Under `Save-Data` it caps the whole set to the light/floor variant, so no artifact can advertise a heavier candidate (#140). The Astro/Cloudflare host projector wires it to real Client Hints. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Authoring model](https://github.com/freebatteryfactory/LiteShip/blob/main/AUTHORING-MODEL.md) — what you type, what comes out
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [Public API roster](https://github.com/freebatteryfactory/LiteShip/blob/main/PUBLIC-EXPORTS.md) — reviewed surface; run `pnpm run docs:build` in a source checkout for TypeDoc

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
