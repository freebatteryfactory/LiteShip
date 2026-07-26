[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / RenderFn

# Type Alias: RenderFn

> **RenderFn** = (`ctx`, `state`, `canvas`) => `void`

Defined in: web/dist/capture/render.d.ts:21

Callback that paints a frame. Receives the 2D context, the composite
state for the current frame, and the canvas itself (useful for
dimension reads).

## Parameters

### ctx

`RenderContext2D`

### state

[`CompositeState`](../../media/interfaces/CompositeState.md)

### canvas

`Canvas2DTarget`

## Returns

`void`
