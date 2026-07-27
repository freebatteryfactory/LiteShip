[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Cell

# Interface: Cell\<T\>

Defined in: [\_spine/core.d.ts:871](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L871)

Reactive state container over CellKernel.replay1 (Effect-free, Wave 6)

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"Cell"`

Defined in: [\_spine/core.d.ts:872](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L872)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:877](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L877)

## Methods

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:873](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L873)

#### Returns

`T`

***

### set()

> **set**(`value`): `void`

Defined in: [\_spine/core.d.ts:874](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L874)

#### Parameters

##### value

`T`

#### Returns

`void`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:876](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L876)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

***

### update()

> **update**(`f`): `void`

Defined in: [\_spine/core.d.ts:875](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L875)

#### Parameters

##### f

(`current`) => `T`

#### Returns

`void`
