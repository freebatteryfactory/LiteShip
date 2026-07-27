[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / CellEnvelope

# Interface: CellEnvelope\<K, T\>

Defined in: [\_spine/core.d.ts:562](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L562)

Typed live-cell payload with its kind and transport metadata.

## Type Parameters

### K

`K` *extends* [`CellKind`](../type-aliases/CellKind.md) = [`CellKind`](../type-aliases/CellKind.md)

### T

`T` = `unknown`

## Properties

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/core.d.ts:564](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L564)

***

### kind

> `readonly` **kind**: `K`

Defined in: [\_spine/core.d.ts:563](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L563)

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [\_spine/core.d.ts:565](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L565)

***

### value

> `readonly` **value**: `T`

Defined in: [\_spine/core.d.ts:566](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L566)
