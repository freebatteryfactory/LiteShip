# @liteship/quantizer

Turns a boundary — named states over numeric thresholds — into a live state machine that emits per-state outputs (CSS, shader uniforms, ARIA attributes) when a value crosses a threshold.

> Install this directly when you need live boundary evaluation outside a framework integration. If you're starting a new project, start with [liteship](https://www.npmjs.com/package/liteship) or [@liteship/astro](https://www.npmjs.com/package/@liteship/astro) instead.

## Install

```bash
pnpm add @liteship/quantizer
```

## 30 seconds

```ts
import { defineBoundary } from '@liteship/core';
import { defineQuantizer, createQuantizer } from '@liteship/quantizer';

const width = defineBoundary({
  input: 'width',
  at: [[0, 'sm'], [768, 'lg']],
});

const config = defineQuantizer(width, {
  outputs: { css: { sm: { display: 'block' }, lg: { display: 'grid' } } },
});

await using live = createQuantizer(config);
live.evaluate(1024);
const outputs = live.currentOutputs.read();
console.log(outputs.css); // { display: 'grid' }
// `live` owns its teardown: `await live.dispose()`, or `await using` as above.
```

Logs `{ display: 'grid' }` — the CSS output for the `lg` state that 1024 falls into. For a one-off lookup, the synchronous `evaluate(boundary, value)` export returns `{ state, index, value, crossed }` directly.

## Where it sits

This is a layered package between definitions and hosts: it imports `Boundary`, easing, and content-address utilities from `@liteship/core` — its only `@liteship` dependency. Compiling outputs to static CSS text for a build step is `@liteship/compiler`'s job; this package is for runtime, where the value keeps changing. See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

If you pass `tier` to `defineQuantizer(boundary, { outputs, tier })`, outputs for targets outside that motion tier are silently dropped — `tier: 'none'` permits only ARIA, so CSS outputs never emit and nothing warns you. Omit `tier` to allow all targets, or add the target to the `force` option (e.g. `force: ['css']`) to override the gate per target.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Authoring model](https://github.com/freebatteryfactory/LiteShip/blob/main/AUTHORING-MODEL.md) — what you type, what comes out
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/quantizer/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
