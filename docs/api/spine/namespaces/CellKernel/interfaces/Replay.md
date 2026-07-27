[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [CellKernel](../README.md) / Replay

# Interface: Replay\<T\>

Defined in: [\_spine/core.d.ts:211](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L211)

Live replay-1 kernel: a current-value slot with synchronous replay-on-subscribe.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellReplay"`

Defined in: [\_spine/core.d.ts:212](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L212)

***

### closed

> `readonly` **closed**: `boolean`

Defined in: [\_spine/core.d.ts:217](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L217)

***

### size

> `readonly` **size**: `number`

Defined in: [\_spine/core.d.ts:218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L218)

## Methods

### close()

> **close**(): `void`

Defined in: [\_spine/core.d.ts:216](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L216)

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: [\_spine/core.d.ts:214](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L214)

#### Parameters

##### value

`T`

#### Returns

`void`

***

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:213](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L213)

#### Returns

`T`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:215](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L215)

#### Parameters

##### subscriber

[`Subscriber`](../type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)
