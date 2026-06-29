# @czap/quantizer

Turns a boundary — named states over numeric thresholds — into a live state machine that emits per-state outputs (CSS, shader uniforms, ARIA attributes) when a value crosses a threshold.

> Install this directly when you need live boundary evaluation outside a framework integration. If you're starting a new project, start with [liteship](https://www.npmjs.com/package/liteship) or [@czap/astro](https://www.npmjs.com/package/@czap/astro) instead.

## Install

```bash
pnpm add @czap/quantizer effect@beta
```

`effect` must be the Effect 4 beta (`effect@beta`) — a bare `pnpm add effect` installs 3.x and fails the peer check.

## 30 seconds

```ts
import { Boundary } from '@czap/core';
import { Q } from '@czap/quantizer';
import { Effect } from 'effect';

const width = Boundary.make({
  input: 'width',
  at: [[0, 'sm'], [768, 'lg']],
});

const config = Q.from(width).outputs({
  css: { sm: { display: 'block' }, lg: { display: 'grid' } },
});

const outputs = Effect.runSync(Effect.scoped(
  Effect.gen(function* () {
    const live = yield* config.create();
    live.evaluate(1024);
    return yield* live.currentOutputs;
  }),
));

console.log(outputs.css); // { display: 'grid' }
```

Logs `{ display: 'grid' }` — the CSS output for the `lg` state that 1024 falls into. For a one-off lookup without Effect, the synchronous `evaluate(boundary, value)` export returns `{ state, index, value, crossed }` directly.

## Where it sits

This is a layered package between definitions and hosts: it imports `Boundary`, easing, and content-address utilities from `@czap/core` — its only `@czap` dependency. Compiling outputs to static CSS text for a build step is `@czap/compiler`'s job; this package is for runtime, where the value keeps changing. See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

If you pass `tier` to `Q.from(boundary, { tier })`, outputs for targets outside that motion tier are silently dropped — `tier: 'none'` permits only ARIA, so CSS outputs never emit and nothing warns you. Omit `tier` to allow all targets, or call `.force('css')` on the builder to override the gate per target.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Authoring model](https://github.com/freebatteryfactory/LiteShip/blob/main/AUTHORING-MODEL.md) — what you type, what comes out
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/quantizer/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
