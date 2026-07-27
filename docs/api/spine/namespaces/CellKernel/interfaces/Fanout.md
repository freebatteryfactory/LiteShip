[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [CellKernel](../README.md) / Fanout

# Interface: Fanout\<T\>

Defined in: [\_spine/core.d.ts:221](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L221)

Live no-replay fan-out kernel: fire-and-forget publish, no current-value slot.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellFanout"`

Defined in: [\_spine/core.d.ts:222](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L222)

***

### closed

> `readonly` **closed**: `boolean`

Defined in: [\_spine/core.d.ts:226](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L226)

***

### size

> `readonly` **size**: `number`

Defined in: [\_spine/core.d.ts:227](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L227)

## Methods

### close()

> **close**(): `void`

Defined in: [\_spine/core.d.ts:225](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L225)

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: [\_spine/core.d.ts:223](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L223)

#### Parameters

##### value

`T`

#### Returns

`void`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:224](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L224)

#### Parameters

##### subscriber

[`Subscriber`](../type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)
