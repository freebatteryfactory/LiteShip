[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/media](../README.md) / AVRenderer

# Variable: AVRenderer

> `const` **AVRenderer**: `object`

Defined in: core/dist/media/av-renderer.d.ts:43

AVRenderer — deterministic offline audio+video renderer.

Steps an [AVBridge](AVBridge.md) in lockstep with a [Compositor](Compositor.md) so every
video frame carries the exact sample offset it corresponds to. Pure clock
math — no wall-clock input, reproducible across runs.

## Type Declaration

### make

> **make**: *typeof* `_make`

Create a renderer bound to a compositor, optionally reusing an existing [AVBridge](AVBridge.md).
