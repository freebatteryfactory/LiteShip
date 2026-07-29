[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / CellSink

# Interface: CellSink\<T\>

Defined in: core/dist/reactive/cell-kernel.d.ts:110

A subscription sink: a `next` value listener and an optional `complete`
callback invoked once when the kernel is closed.

## Type Parameters

### T

`T`

## Properties

### complete?

> `readonly` `optional` **complete?**: () => `void`

Defined in: core/dist/reactive/cell-kernel.d.ts:112

#### Returns

`void`

***

### next

> `readonly` **next**: (`value`) => `void`

Defined in: core/dist/reactive/cell-kernel.d.ts:111

#### Parameters

##### value

`T`

#### Returns

`void`
