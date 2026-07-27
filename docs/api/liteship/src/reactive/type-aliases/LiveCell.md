[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / LiveCell

# Type Alias: LiveCell\<K, T\>

> **LiveCell**\<`K`, `T`\> = `LiveCellShape`\<`K`, `T`\>

Defined in: core/dist/reactive/live-cell.d.ts:87

Public structural type for `LiveCell` — the bridge between the [Cell](Cell.md)
reactive graph and the wire protocol. A `LiveCell` wraps a `Cell` with a typed
[CellEnvelope](../../schema/interfaces/CellEnvelope.md) — kind, content address, HLC, boundary crossings — so
primitives can travel between peers as self-describing messages. Construct one
with the standalone [createLiveCell](../functions/createLiveCell.md) / [createLiveCellBoundary](../functions/createLiveCellBoundary.md)
(verb grammar, ADR-0046 — `create` allocates a runtime resource).

## Type Parameters

### K

`K` *extends* [`CellKind`](../../schema/type-aliases/CellKind.md)

### T

`T`
