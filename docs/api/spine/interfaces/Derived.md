[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / Derived

# Interface: Derived\<T\>

Defined in: [\_spine/core.d.ts:885](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L885)

Read-only derived computation over CellKernel.replay1 (Effect-free, Wave 6)

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"Derived"`

Defined in: [\_spine/core.d.ts:886](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L886)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:889](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L889)

## Methods

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:887](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L887)

#### Returns

`T`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:888](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L888)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)
