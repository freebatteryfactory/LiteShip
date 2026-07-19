[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / AnimatedQuantizer

# Variable: AnimatedQuantizer

> `const` **AnimatedQuantizer**: `object`

Defined in: [quantizer/src/animated-quantizer.ts:469](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L469)

Animated quantizer namespace.

Wraps a reactive quantizer with transition-aware interpolation. When a
boundary crossing occurs, numeric output values are lerped over a configurable
duration and easing curve. Non-numeric values snap at the 50% mark.
The `interpolated` fan-out publishes frames containing progress (0-1) and
the current interpolated output record.

## Type Declaration

### make

> `readonly` **make**: \<`B`\>(`quantizer`, `transitions`, `outputs?`, `options?`) => [`AnimatedQuantizerHandle`](../interfaces/AnimatedQuantizerHandle.md)\<`B`\> = `makeAnimatedQuantizer`

Wrap a quantizer with transition-aware output interpolation.

Create an animated quantizer that interpolates outputs during transitions.

Wraps an existing [ReactiveQuantizer](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/quantizer-types.ts) and applies easing/duration-based
interpolation between old and new output values when a boundary crossing
occurs. Publishes an `interpolated` fan-out of frames with progress and lerped
numeric outputs — at ~60fps by default, or on the cadence of an injected
`options.scheduler` (`raf` / `fixedStep` / `audioSync`).

The wrapped quantizer's crossings are observed eagerly (one shared
subscription): each crossing interrupts the prior animation via a per-crossing
[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) — aborting breaks the `for await` over
[Animation.run](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/animation.ts), whose `finally` cancels the pending scheduler tick — and
starts a fresh animation. Dispose the returned [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/lifetime.ts) to detach the
crossing subscription, abort the in-flight animation, and close the fan-out.

#### Type Parameters

##### B

`B` *extends* [`Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### quantizer

[`ReactiveQuantizer`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/quantizer-types.ts)\<`B`\>

The reactive quantizer to wrap

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

[`AnimatedQuantizerHandle`](../interfaces/AnimatedQuantizerHandle.md)\<`B`\>

An [AnimatedQuantizerHandle](../interfaces/AnimatedQuantizerHandle.md) — the instance plus its [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/lifetime.ts)

#### Example

```ts
import { Boundary, Millis } from '@liteship/core';
import { Q, AnimatedQuantizer } from '@liteship/quantizer';

const boundary = Boundary.make({
  input: 'scroll',
  at: [[0, 'top'], [500, 'bottom']],
});
const config = Q.from(boundary).outputs({
  css: { top: { opacity: '1' }, bottom: { opacity: '0.5' } },
});
const { quantizer: live } = config.create();
// outputs omitted: derived from the LiveQuantizer's css output tables
const { animated, lifetime } = AnimatedQuantizer.make(live, { '*': { duration: Millis(300) } });
const dispose = animated.interpolated.subscribe((frame) => { ... });
live.evaluate(600); // triggers interpolation
```

## Example

```ts
import { Boundary, Millis } from '@liteship/core';
import { Q, AnimatedQuantizer } from '@liteship/quantizer';

const boundary = Boundary.make({
  input: 'scroll',
  at: [[0, 'top'], [500, 'bottom']],
});
const config = Q.from(boundary).outputs({});
const { quantizer: live } = config.create();
const { animated, lifetime } = AnimatedQuantizer.make(live, { '*': { duration: Millis(200) } });
animated.transition; // TransitionResolver
await lifetime.dispose();
```
