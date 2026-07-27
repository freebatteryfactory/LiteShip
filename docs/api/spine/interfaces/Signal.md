[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Signal

# Interface: Signal\<T\>

Defined in: [\_spine/core.d.ts:314](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L314)

Reactive signal over CellKernel.replay1 (Effect-free, Wave 6)

## Extended by

- [`ControllableSignal`](ControllableSignal.md)

## Type Parameters

### T

`T`

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:318](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L318)

***

### source

> `readonly` **source**: [`SignalSource`](../type-aliases/SignalSource.md)

Defined in: [\_spine/core.d.ts:315](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L315)

## Methods

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:316](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L316)

#### Returns

`T`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:317](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L317)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)
