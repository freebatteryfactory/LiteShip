[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [CellKernel](../README.md) / Replay

# Interface: Replay\<T\>

Defined in: [\_spine/core.d.ts:205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L205)

Live replay-1 kernel: a current-value slot with synchronous replay-on-subscribe.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellReplay"`

Defined in: [\_spine/core.d.ts:206](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L206)

***

### closed

> `readonly` **closed**: `boolean`

Defined in: [\_spine/core.d.ts:211](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L211)

***

### size

> `readonly` **size**: `number`

Defined in: [\_spine/core.d.ts:212](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L212)

## Methods

### close()

> **close**(): `void`

Defined in: [\_spine/core.d.ts:210](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L210)

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: [\_spine/core.d.ts:208](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L208)

#### Parameters

##### value

`T`

#### Returns

`void`

***

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:207](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L207)

#### Returns

`T`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:209](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L209)

#### Parameters

##### subscriber

[`Subscriber`](../type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)
