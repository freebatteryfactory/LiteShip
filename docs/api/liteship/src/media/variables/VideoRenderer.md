[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / VideoRenderer

# Variable: VideoRenderer

> `const` **VideoRenderer**: `object`

Defined in: core/dist/media/video.d.ts:80

VideoRenderer — fixed-step frame generator for deterministic offline rendering.
Drives a [Compositor](Compositor.md) at the configured fps and optionally seeks a
controllable time [Signal](../../reactive/variables/Signal.md) so every frame is reproducible.

## Type Declaration

### make

> **make**: *typeof* `_make`

Create a renderer bound to the given compositor and optional seekable time signal.
