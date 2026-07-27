[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [CellKernel](../README.md) / Fanout

# Interface: Fanout\<T\>

Defined in: [\_spine/core.d.ts:215](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L215)

Live no-replay fan-out kernel: fire-and-forget publish, no current-value slot.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellFanout"`

Defined in: [\_spine/core.d.ts:216](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L216)

***

### closed

> `readonly` **closed**: `boolean`

Defined in: [\_spine/core.d.ts:220](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L220)

***

### size

> `readonly` **size**: `number`

Defined in: [\_spine/core.d.ts:221](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L221)

## Methods

### close()

> **close**(): `void`

Defined in: [\_spine/core.d.ts:219](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L219)

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: [\_spine/core.d.ts:217](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L217)

#### Parameters

##### value

`T`

#### Returns

`void`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L218)

#### Parameters

##### subscriber

[`Subscriber`](../type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)
