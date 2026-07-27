[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / LiveCell

# Type Alias: LiveCell\<K, T\>

> **LiveCell**\<`K`, `T`\> = `LiveCellShape`\<`K`, `T`\>

Defined in: [core/src/reactive/live-cell.ts:290](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/live-cell.ts#L290)

Public structural type for `LiveCell` — the bridge between the [Cell](Cell.md)
reactive graph and the wire protocol. A `LiveCell` wraps a `Cell` with a typed
[CellEnvelope](../interfaces/CellEnvelope.md) — kind, content address, HLC, boundary crossings — so
primitives can travel between peers as self-describing messages. Construct one
with the standalone [createLiveCell](../functions/createLiveCell.md) / [createLiveCellBoundary](../functions/createLiveCellBoundary.md)
(verb grammar, ADR-0046 — `create` allocates a runtime resource).

## Type Parameters

### K

`K` *extends* [`CellKind`](CellKind.md)

### T

`T`
