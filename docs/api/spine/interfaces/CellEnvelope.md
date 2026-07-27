[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / CellEnvelope

# Interface: CellEnvelope\<K, T\>

Defined in: [\_spine/core.d.ts:589](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L589)

Typed live-cell payload with its kind and transport metadata.

## Type Parameters

### K

`K` *extends* [`CellKind`](../type-aliases/CellKind.md) = [`CellKind`](../type-aliases/CellKind.md)

### T

`T` = `unknown`

## Properties

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/core.d.ts:591](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L591)

***

### kind

> `readonly` **kind**: `K`

Defined in: [\_spine/core.d.ts:590](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L590)

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [\_spine/core.d.ts:592](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L592)

***

### value

> `readonly` **value**: `T`

Defined in: [\_spine/core.d.ts:593](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L593)
