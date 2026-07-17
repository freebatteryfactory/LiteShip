[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Animation

# Variable: Animation

> `const` **Animation**: `object`

Defined in: [core/src/animation.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/animation.ts#L99)

Animation — rAF-driven value interpolation exposed as an `AsyncIterable`.
Pairs a duration and easing with either primitive lerping or the generic
[Animation.interpolate](#interpolate) over numeric records.

## Type Declaration

### interpolate

> **interpolate**: \<`T`\>(`from`, `to`, `eased`, `defaults?`) => `T`

Shallow numeric-record interpolator; non-numeric keys pass through.

Interpolate between two numeric records using an eased value [0..1].
Returns a new record with each property lerped: from[k] + (to[k] - from[k]) * eased.

#### Type Parameters

##### T

`T` *extends* `Record`\<`string`, `number`\>

#### Parameters

##### from

`T`

##### to

`T`

##### eased

`number`

##### defaults?

`Partial`\<`Record`\<`string`, `number`\>\>

#### Returns

`T`

### run

> **run**: (`config`) => `AsyncGenerator`\<`AnimationFrameShape`, `void`, `void`\> = `_run`

Run an rAF animation that yields an async iterable of [Animation.Frame](../namespaces/Animation/type-aliases/Frame.md).

Run a finite animation as an `AsyncIterable` of [Animation.Frame](../namespaces/Animation/type-aliases/Frame.md)
values driven by requestAnimationFrame (or an injected [Scheduler](Scheduler.md)).
Emits frames from progress 0 to 1; a non-positive duration yields exactly one
completed frame.

The generator is a single-consumer pull clock: each iteration schedules ONE
tick and awaits it, so at most one frame callback is ever outstanding. Its
`finally` cancels that pending tick when the animation completes (progress
reaches 1) OR when the consumer stops early (a `for await` `break`, which
invokes the generator's `return`) — the replacement for the old Effect scope
finalizer (`addFinalizer(sched.cancel)`).

#### Parameters

##### config

###### duration

`Millis`

###### easing?

`EasingFnShape`

###### scheduler?

`SchedulerShape`

#### Returns

`AsyncGenerator`\<`AnimationFrameShape`, `void`, `void`\>
