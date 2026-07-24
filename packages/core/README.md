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
console.log(viewport.id);                      // 'fnv1a:bf4e9a2f'
```

Logs `tablet` (800 sits between the 768 and 1280 thresholds), then the boundary's content address — the same address on every machine, because it is computed from the definition itself. The `hysteresis: 20` is a dead zone that stops state flicker right at a threshold.

## Where it sits

This is the foundation layer — every other `@liteship/*` package imports its primitives. Its one `@liteship` dependency is `@liteship/_spine`, the shared type declarations its published types reference. Two things commonly assumed to be here live elsewhere: live evaluation against a changing signal is `@liteship/quantizer`, and compiling definitions to CSS text is `@liteship/compiler`. It does own the canonical signal-input vocabulary, though: `SignalSource` ⇄ `SignalInput` via `sourceToInput`/`inputToSource` — the source of truth for input strings like `viewport.width`, `scroll.progress`, `audio.amplitude` that every host reads through rather than re-parsing. See the

It also owns the **one motion kernel** both floors share. `interpolateTyped` interpolates `TypedValue`s within-kind — including a `color` arm (sRGB / OKLCH, parsed from `#hex` / `rgb()` / `oklch()`) that lerps components within a space and **refuses cross-space interpolation loudly** (no silent lerp across color models). The easing lives IN the lowered plan: `interpretTransition` projects the authored `TransitionNode.easing` onto `RuntimeWritePlan.easing` (a self-describing `{ kind, spring? }` descriptor), and `sampleRuntimeEasing` builds the `(t) => value` sampler — its spring arm delegating to the EXACT `Easing.spring` that `Easing.springToLinearCSS` samples for the CSS `linear()` timing function. So the native CSS path and the JS runtime floor read one identical curve, never a fork.

It owns the **one responsive-media effective-candidate law** too: `selectCandidates(intent, caps)` returns the `ResponsiveMediaCandidateSet` every output derives from — `resolveResponsiveMedia`'s `src`, `projectResponsiveMediaPicture`'s `srcset` / `<source>` / preload `imagesrcset`, and `@liteship/compiler`'s `image-set()` + cache-key digest. Under `Save-Data` it caps the whole set to the light/floor variant, so no artifact can advertise a heavier candidate (#140). The Astro/Cloudflare host projector wires it to real Client Hints.
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Authoring model](https://github.com/freebatteryfactory/LiteShip/blob/main/AUTHORING-MODEL.md) — what you type, what comes out
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/core/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
