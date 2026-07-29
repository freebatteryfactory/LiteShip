[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / renderToCanvas

# Function: renderToCanvas()

> **renderToCanvas**(`state`, `canvas`, `renderFn?`): `void`

Defined in: web/dist/capture/render.d.ts:28

Render CompositeState to an OffscreenCanvas.

If no custom renderFn is provided, the default renderer applies
CSS vars from CompositeState.outputs.css as basic canvas fills.

## Parameters

### state

[`CompositeState`](../../media/interfaces/CompositeState.md)

### canvas

`Canvas2DTarget`

### renderFn?

[`RenderFn`](../type-aliases/RenderFn.md)

## Returns

`void`
