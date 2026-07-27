[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CellSink

# Interface: CellSink\<T\>

Defined in: [core/src/reactive/cell-kernel.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/cell-kernel.ts#L117)

A subscription sink: a `next` value listener and an optional `complete`
callback invoked once when the kernel is closed.

## Type Parameters

### T

`T`

## Properties

### complete?

> `readonly` `optional` **complete?**: () => `void`

Defined in: [core/src/reactive/cell-kernel.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/cell-kernel.ts#L119)

#### Returns

`void`

***

### next

> `readonly` **next**: (`value`) => `void`

Defined in: [core/src/reactive/cell-kernel.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/cell-kernel.ts#L118)

#### Parameters

##### value

`T`

#### Returns

`void`
