[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / Store

# Interface: Store\<S, Msg\>

Defined in: [\_spine/core.d.ts:948](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L948)

TEA-style reducer store over CellKernel.replay1 (Effect-free, Wave 6)

## Type Parameters

### S

`S`

### Msg

`Msg`

## Properties

### \_tag

> `readonly` **\_tag**: `"Store"`

Defined in: [\_spine/core.d.ts:949](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L949)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:953](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L953)

## Methods

### dispatch()

> **dispatch**(`msg`): `void`

Defined in: [\_spine/core.d.ts:952](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L952)

#### Parameters

##### msg

`Msg`

#### Returns

`void`

***

### read()

> **read**(): `S`

Defined in: [\_spine/core.d.ts:950](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L950)

#### Returns

`S`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:951](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L951)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<`S`\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)
