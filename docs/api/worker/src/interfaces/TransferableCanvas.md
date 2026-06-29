[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / TransferableCanvas

# Interface: TransferableCanvas

Defined in: [worker/src/host.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L34)

The canvas surface [WorkerHostShape.attachCanvas](WorkerHostShape.md#attachcanvas) actually needs:
one transferable handoff. Structural rather than `HTMLCanvasElement` so
the dependency is named — test doubles (tests/helpers/mock-dom.ts) conform
to THIS type, and non-DOM canvas implementations work unchanged.

## Properties

### height

> `readonly` **height**: `number`

Defined in: [worker/src/host.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L38)

Pixel height, captured at transfer time as the default render height.

***

### width

> `readonly` **width**: `number`

Defined in: [worker/src/host.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L36)

Pixel width, captured at transfer time as the default render width.

## Methods

### transferControlToOffscreen()

> **transferControlToOffscreen**(): `OffscreenCanvas`

Defined in: [worker/src/host.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L39)

#### Returns

`OffscreenCanvas`
