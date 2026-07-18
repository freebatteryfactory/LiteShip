[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CellSink

# Interface: CellSink\<T\>

Defined in: [core/src/cell-kernel.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L104)

A subscription sink: a `next` value listener and an optional `complete`
callback invoked once when the kernel is closed.

## Type Parameters

### T

`T`

## Properties

### complete?

> `readonly` `optional` **complete?**: () => `void`

Defined in: [core/src/cell-kernel.ts:106](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L106)

#### Returns

`void`

***

### next

> `readonly` **next**: (`value`) => `void`

Defined in: [core/src/cell-kernel.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L105)

#### Parameters

##### value

`T`

#### Returns

`void`
