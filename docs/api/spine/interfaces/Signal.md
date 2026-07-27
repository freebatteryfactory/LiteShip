[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Signal

# Interface: Signal\<T\>

Defined in: [\_spine/core.d.ts:308](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L308)

Reactive signal over CellKernel.replay1 (Effect-free, Wave 6)

## Extended by

- [`ControllableSignal`](ControllableSignal.md)

## Type Parameters

### T

`T`

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:312](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L312)

***

### source

> `readonly` **source**: [`SignalSource`](../type-aliases/SignalSource.md)

Defined in: [\_spine/core.d.ts:309](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L309)

## Methods

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:310](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L310)

#### Returns

`T`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:311](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L311)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)
