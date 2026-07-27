[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [CellKernel](../README.md) / Sink

# Interface: Sink\<T\>

Defined in: [\_spine/core.d.ts:204](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L204)

A subscription sink: a `next` value listener plus an optional close `complete` callback.

## Type Parameters

### T

`T`

## Properties

### complete?

> `readonly` `optional` **complete?**: () => `void`

Defined in: [\_spine/core.d.ts:206](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L206)

#### Returns

`void`

***

### next

> `readonly` **next**: (`value`) => `void`

Defined in: [\_spine/core.d.ts:205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L205)

#### Parameters

##### value

`T`

#### Returns

`void`
