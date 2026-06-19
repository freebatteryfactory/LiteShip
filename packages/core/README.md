# @czap/core

Creates the definitions — boundaries (named states over a numeric signal), design tokens, styles, themes — that the rest of LiteShip compiles to CSS and evaluates at runtime.

> Install this directly when you want the definition primitives without a framework integration. If you're starting a new project, start with [liteship](https://www.npmjs.com/package/liteship) or [@czap/astro](https://www.npmjs.com/package/@czap/astro) instead.

## Install

```bash
pnpm add @czap/core effect@beta
```

`effect` is the one peer dependency and it must be the Effect 4 beta (`effect@beta`) — a bare `pnpm add effect` installs 3.x and fails the peer check.

## 30 seconds

```ts
import { Boundary } from '@czap/core';

const viewport = Boundary.make({
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

This is the foundation layer — every other `@czap/*` package imports its primitives. Its one `@czap` dependency is `@czap/_spine`, the shared type declarations its published types reference. Two things commonly assumed to be here live elsewhere: live evaluation against a changing signal is `@czap/quantizer`, and compiling definitions to CSS text is `@czap/compiler`. It does own the canonical signal-input vocabulary, though: `SignalSource` ⇄ `SignalInput` via `sourceToInput`/`inputToSource` — the source of truth for input strings like `viewport.width`, `scroll.progress`, `audio.amplitude` that every host reads through rather than re-parsing. See the
[package surfaces map](https://github.com/heyoub/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## Docs

- [Getting started](https://github.com/heyoub/LiteShip/blob/main/GETTING-STARTED.md)
- [Authoring model](https://github.com/heyoub/LiteShip/blob/main/AUTHORING-MODEL.md) — what you type, what comes out
- [Glossary](https://github.com/heyoub/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/core/src/) — generated from source

---

Part of [LiteShip](https://github.com/heyoub/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
