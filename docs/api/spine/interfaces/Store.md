[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Store

# Interface: Store\<S, Msg\>

Defined in: [\_spine/core.d.ts:732](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L732)

TEA-style reducer store over CellKernel.replay1 (Effect-free, Wave 6)

## Type Parameters

### S

`S`

### Msg

`Msg`

## Properties

### \_tag

> `readonly` **\_tag**: `"Store"`

Defined in: [\_spine/core.d.ts:733](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L733)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:737](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L737)

## Methods

### dispatch()

> **dispatch**(`msg`): `void`

Defined in: [\_spine/core.d.ts:736](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L736)

#### Parameters

##### msg

`Msg`

#### Returns

`void`

***

### read()

> **read**(): `S`

Defined in: [\_spine/core.d.ts:734](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L734)

#### Returns

`S`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:735](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L735)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<`S`\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)
