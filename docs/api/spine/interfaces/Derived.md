[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Derived

# Interface: Derived\<T\>

Defined in: [\_spine/core.d.ts:669](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L669)

Read-only derived computation over CellKernel.replay1 (Effect-free, Wave 6)

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"Derived"`

Defined in: [\_spine/core.d.ts:670](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L670)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:673](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L673)

## Methods

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:671](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L671)

#### Returns

`T`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:672](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L672)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)
