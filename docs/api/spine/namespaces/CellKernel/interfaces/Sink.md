[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [CellKernel](../README.md) / Sink

# Interface: Sink\<T\>

Defined in: [\_spine/core.d.ts:198](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L198)

A subscription sink: a `next` value listener plus an optional close `complete` callback.

## Type Parameters

### T

`T`

## Properties

### complete?

> `readonly` `optional` **complete?**: () => `void`

Defined in: [\_spine/core.d.ts:200](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L200)

#### Returns

`void`

***

### next

> `readonly` **next**: (`value`) => `void`

Defined in: [\_spine/core.d.ts:199](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L199)

#### Parameters

##### value

`T`

#### Returns

`void`
