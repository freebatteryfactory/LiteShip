[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / Animation

# Variable: Animation

> `const` **Animation**: `object`

Defined in: core/dist/motion/animation.d.ts:45

Animation — rAF-driven value interpolation exposed as an `AsyncIterable`.
Pairs a duration and easing with either primitive lerping or the generic
[Animation.interpolate](#interpolate) over numeric records.

## Type Declaration

### interpolate

> **interpolate**: *typeof* [`interpolate`](../functions/interpolate.md)

Shallow numeric-record interpolator; non-numeric keys pass through.

### run

> **run**: *typeof* `_run`

Run an rAF animation that yields an async iterable of [Animation.Frame](../namespaces/Animation/type-aliases/Frame.md).
