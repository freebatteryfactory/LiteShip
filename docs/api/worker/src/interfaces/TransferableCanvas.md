[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / TransferableCanvas

# Interface: TransferableCanvas

Defined in: [worker/src/host.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L32)

The canvas surface [WorkerHostShape.attachCanvas](WorkerHostShape.md#attachcanvas) actually needs:
one transferable handoff. Structural rather than `HTMLCanvasElement` so
the dependency is named — test doubles (tests/helpers/mock-dom.ts) conform
to THIS type, and non-DOM canvas implementations work unchanged.

## Methods

### transferControlToOffscreen()

> **transferControlToOffscreen**(): `OffscreenCanvas`

Defined in: [worker/src/host.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L33)

#### Returns

`OffscreenCanvas`
