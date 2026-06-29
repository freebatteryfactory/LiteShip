[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / renderToCanvas

# Function: renderToCanvas()

> **renderToCanvas**(`state`, `canvas`, `renderFn?`): `void`

Defined in: [web/src/capture/render.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/capture/render.ts#L68)

Render CompositeState to an OffscreenCanvas.

If no custom renderFn is provided, the default renderer applies
CSS vars from CompositeState.outputs.css as basic canvas fills.

## Parameters

### state

[`CompositeState`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/compositor-pool.ts)

### canvas

`Canvas2DTarget`

### renderFn?

[`RenderFn`](../type-aliases/RenderFn.md)

## Returns

`void`
