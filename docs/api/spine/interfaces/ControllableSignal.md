[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ControllableSignal

# Interface: ControllableSignal\<T\>

Defined in: [\_spine/core.d.ts:316](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L316)

Signal whose host can seek, pause, and resume the underlying source.

## Extends

- [`Signal`](Signal.md)\<`T`\>

## Type Parameters

### T

`T`

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:312](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L312)

#### Inherited from

[`Signal`](Signal.md).[`lifetime`](Signal.md#lifetime)

***

### source

> `readonly` **source**: [`SignalSource`](../type-aliases/SignalSource.md)

Defined in: [\_spine/core.d.ts:309](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L309)

#### Inherited from

[`Signal`](Signal.md).[`source`](Signal.md#source)

## Methods

### pause()

> **pause**(): `void`

Defined in: [\_spine/core.d.ts:318](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L318)

#### Returns

`void`

***

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:310](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L310)

#### Returns

`T`

#### Inherited from

[`Signal`](Signal.md).[`read`](Signal.md#read)

***

### resume()

> **resume**(): `void`

Defined in: [\_spine/core.d.ts:319](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L319)

#### Returns

`void`

***

### seek()

> **seek**(`to`): `void`

Defined in: [\_spine/core.d.ts:317](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L317)

#### Parameters

##### to

`T`

#### Returns

`void`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:311](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L311)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

#### Inherited from

[`Signal`](Signal.md).[`subscribe`](Signal.md#subscribe)
