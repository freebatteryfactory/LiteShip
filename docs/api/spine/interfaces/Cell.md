[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Cell

# Interface: Cell\<T\>

Defined in: [\_spine/core.d.ts:656](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L656)

Reactive state container over CellKernel.replay1 (Effect-free, Wave 6)

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"Cell"`

Defined in: [\_spine/core.d.ts:657](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L657)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:662](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L662)

## Methods

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:658](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L658)

#### Returns

`T`

***

### set()

> **set**(`value`): `void`

Defined in: [\_spine/core.d.ts:659](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L659)

#### Parameters

##### value

`T`

#### Returns

`void`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:661](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L661)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

***

### update()

> **update**(`f`): `void`

Defined in: [\_spine/core.d.ts:660](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L660)

#### Parameters

##### f

(`current`) => `T`

#### Returns

`void`
