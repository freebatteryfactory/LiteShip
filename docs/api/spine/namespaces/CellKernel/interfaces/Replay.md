[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [\_spine](../../../README.md) / [CellKernel](../README.md) / Replay

# Interface: Replay\<T\>

Defined in: [\_spine/core.d.ts:212](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L212)

Live replay-1 kernel: a current-value slot with synchronous replay-on-subscribe.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellReplay"`

Defined in: [\_spine/core.d.ts:213](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L213)

***

### closed

> `readonly` **closed**: `boolean`

Defined in: [\_spine/core.d.ts:218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L218)

***

### size

> `readonly` **size**: `number`

Defined in: [\_spine/core.d.ts:219](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L219)

## Methods

### close()

> **close**(): `void`

Defined in: [\_spine/core.d.ts:217](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L217)

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: [\_spine/core.d.ts:215](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L215)

#### Parameters

##### value

`T`

#### Returns

`void`

***

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:214](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L214)

#### Returns

`T`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:216](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L216)

#### Parameters

##### subscriber

[`Subscriber`](../type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)
