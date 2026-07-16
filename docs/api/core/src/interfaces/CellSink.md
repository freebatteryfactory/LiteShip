[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CellSink

# Interface: CellSink\<T\>

Defined in: [core/src/cell-kernel.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L59)

A subscription sink: a `next` value listener and an optional `complete`
callback invoked once when the kernel is closed.

## Type Parameters

### T

`T`

## Properties

### complete?

> `readonly` `optional` **complete?**: () => `void`

Defined in: [core/src/cell-kernel.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L61)

#### Returns

`void`

***

### next

> `readonly` **next**: (`value`) => `void`

Defined in: [core/src/cell-kernel.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L60)

#### Parameters

##### value

`T`

#### Returns

`void`
