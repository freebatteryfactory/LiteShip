[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / CellEnvelope

# Interface: CellEnvelope\<K, T\>

Defined in: core/dist/schema/protocol.d.ts:27

Wire-level envelope for a cell value: tagged by [CellKind](../type-aliases/CellKind.md), identified
by its content address, stamped with [CellMeta](CellMeta.md), carrying the typed
payload in `value`.

## Type Parameters

### K

`K` *extends* [`CellKind`](../type-aliases/CellKind.md) = [`CellKind`](../type-aliases/CellKind.md)

### T

`T` = `unknown`

## Properties

### id

> `readonly` **id**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/schema/protocol.d.ts:29

***

### kind

> `readonly` **kind**: `K`

Defined in: core/dist/schema/protocol.d.ts:28

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: core/dist/schema/protocol.d.ts:30

***

### value

> `readonly` **value**: `T`

Defined in: core/dist/schema/protocol.d.ts:31
