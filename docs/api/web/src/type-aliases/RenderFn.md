[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / RenderFn

# Type Alias: RenderFn

> **RenderFn** = (`ctx`, `state`, `canvas`) => `void`

Defined in: [web/src/capture/render.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/capture/render.ts#L30)

Callback that paints a frame. Receives the 2D context, the composite
state for the current frame, and the canvas itself (useful for
dimension reads).

## Parameters

### ctx

`RenderContext2D`

### state

[`CompositeState`](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/compositor-pool.ts)

### canvas

`Canvas2DTarget`

## Returns

`void`
