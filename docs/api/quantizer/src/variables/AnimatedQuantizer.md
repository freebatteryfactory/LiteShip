[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / AnimatedQuantizer

# Variable: AnimatedQuantizer

> `const` **AnimatedQuantizer**: `object`

Defined in: [quantizer/src/animated-quantizer.ts:349](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L349)

Animated quantizer namespace.

Wraps a base quantizer with transition-aware interpolation. When a boundary
crossing occurs, numeric output values are lerped over a configurable
duration and easing curve. Non-numeric values snap at the 50% mark.
The `interpolated` stream emits frames containing progress (0-1) and
the current interpolated output record.

## Type Declaration

### make

> `readonly` **make**: \<`B`\>(`quantizer`, `transitions`, `outputs?`, `options?`) => `Effect`\<[`AnimatedQuantizerShape`](../interfaces/AnimatedQuantizerShape.md)\<`B`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\> = `makeAnimatedQuantizer`

Wrap a quantizer with transition-aware output interpolation.

Create an animated quantizer that interpolates outputs during transitions.

Wraps an existing [Quantizer](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/Quantizer.md) and applies easing/duration-based
interpolation between old and new output values when a boundary crossing
occurs. Produces an `interpolated` stream of frames with progress and
lerped numeric outputs — at ~60fps by default, or on the cadence of an
injected `options.scheduler` (`raf` / `fixedStep` / `audioSync`).

#### Type Parameters

##### B

`B` *extends* [`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### quantizer

[`Quantizer`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/Quantizer.md)\<`B`\>

The base quantizer to wrap

##### transitions

[`TransitionMap`](../type-aliases/TransitionMap.md)\<`StateUnion`\<`B`\>\>

Map of state transition configs keyed by `from->to` pattern

##### outputs?

`Record`\<`string`, `Record`\<`string`, `string` \| `number`\>\>

Per-state numeric output maps for interpolation; omitted,
                     they are derived from the wrapped LiveQuantizer's
                     `config.outputs.css` tables (finite-numeric strings are
                     coerced to numbers so they lerp)

##### options?

Optional injection bag. `options.scheduler` supplies a
                     `Scheduler.Shape` frame clock (e.g. `Scheduler.raf()`
                     to align frames to the display, or `Scheduler.fixedStep(fps)`
                     for deterministic rendering/tests). Omitted, the animation
                     drives its own internal ~60fps loop via a fixed 16ms sleep
                     (the historical default — existing callers are unchanged).

###### scheduler?

`SchedulerShape`

#### Returns

`Effect`\<[`AnimatedQuantizerShape`](../interfaces/AnimatedQuantizerShape.md)\<`B`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>

An Effect yielding an [AnimatedQuantizerShape](../interfaces/AnimatedQuantizerShape.md) (scoped)

#### Example

```ts
import { Boundary, Millis } from '@czap/core';
import { Q, AnimatedQuantizer } from '@czap/quantizer';
import { Effect, Stream } from 'effect';

const boundary = Boundary.make({
  input: 'scroll',
  at: [[0, 'top'], [500, 'bottom']],
});
const config = Q.from(boundary).outputs({
  css: { top: { opacity: '1' }, bottom: { opacity: '0.5' } },
});
const program = Effect.scoped(Effect.gen(function* () {
  const live = yield* config.create();
  // outputs omitted: derived from the LiveQuantizer's css output tables
  const animated = yield* AnimatedQuantizer.make(
    live,
    { '*': { duration: Millis(300) } },
  );
  live.evaluate(600); // triggers interpolation
  return animated;
}));
```

## Example

```ts
import { Boundary, Millis } from '@czap/core';
import { Q, AnimatedQuantizer } from '@czap/quantizer';
import { Effect } from 'effect';

const boundary = Boundary.make({
  input: 'scroll',
  at: [[0, 'top'], [500, 'bottom']],
});
const config = Q.from(boundary).outputs({});
const program = Effect.scoped(Effect.gen(function* () {
  const live = yield* config.create();
  const animated = yield* AnimatedQuantizer.make(
    live,
    { '*': { duration: Millis(200) } },
  );
  return animated.transition; // TransitionResolver
}));
```
