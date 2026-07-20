# @liteship/compiler

Compiles boundary definitions — named states over numeric thresholds — and per-state values into `@container` CSS rules, GLSL/WGSL shader uniforms, ARIA attributes, and AI manifests.

> You usually don't install this directly — it arrives as a dependency of [@liteship/vite](https://www.npmjs.com/package/@liteship/vite), which compiles your authored CSS at build time. Install `@liteship/vite` instead unless you want to call a compile target yourself, e.g. in your own build script.

## Install

```bash
# inside a build integration (the usual path):
pnpm add @liteship/vite # brings @liteship/compiler with it

# to run the example below directly (pnpm does not hoist transitives):
pnpm add @liteship/compiler @liteship/core
```

## 30 seconds

```ts
import { defineBoundary } from '@liteship/core';
import { CSSCompiler } from '@liteship/compiler';

const width = defineBoundary({
  input: 'width',
  at: [[0, 'sm'], [768, 'lg']],
});

const result = CSSCompiler.compile(width, {
  sm: { 'font-size': '14px' },
  lg: { 'font-size': '18px' },
}, '.card');

console.log(result.raw);
```

Prints two `@container` blocks: `(width < 768px)` styling `.card` at 14px, and `(width >= 768px)` at 18px. `result.containerRules` holds the same output as structured data.

## Where it sits

This is a layered package of pure functions from definitions to text — no DOM, no file system, nothing thrown. Its only `@liteship` dependency is `@liteship/core`, the source of the boundary, token, style, and theme definitions it compiles. Live evaluation as values change at runtime lives in `@liteship/quantizer`; writing compiled CSS into your bundle is `@liteship/vite`'s job. See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

State keys in the second argument are all optional, so a misspelled state name produces no rule and no error — the output is just missing a block. If `result.raw` is shorter than expected, compare your keys against `boundary.states`.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Authoring model](https://github.com/freebatteryfactory/LiteShip/blob/main/AUTHORING-MODEL.md) — what you type, what comes out
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/compiler/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
