[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [\_spine](../../../README.md) / [CellKernel](../README.md) / Sink

# Interface: Sink\<T\>

Defined in: [\_spine/core.d.ts:205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L205)

A subscription sink: a `next` value listener plus an optional close `complete` callback.

## Type Parameters

### T

`T`

## Properties

### complete?

> `readonly` `optional` **complete?**: () => `void`

Defined in: [\_spine/core.d.ts:207](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L207)

#### Returns

`void`

***

### next

> `readonly` **next**: (`value`) => `void`

Defined in: [\_spine/core.d.ts:206](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L206)

#### Parameters

##### value

`T`

#### Returns

`void`
