[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / LiveCell

# Interface: LiveCell\<K, T\>

Defined in: [\_spine/core.d.ts:1026](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1026)

Reactive cell specialized to a declared transport or projection kind.

## Extends

- `Omit`\<[`Cell`](Cell.md)\<`T`\>, `"_tag"`\>

## Type Parameters

### K

`K` *extends* [`CellKind`](../type-aliases/CellKind.md)

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"LiveCell"`

Defined in: [\_spine/core.d.ts:1027](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1027)

***

### crossings

> `readonly` **crossings**: `Pick`\<[`Fanout`](../namespaces/CellKernel/interfaces/Fanout.md)\<[`BoundaryCrossing`](../type-aliases/BoundaryCrossing.md)\<`string`\>\>, `"subscribe"`\>

Defined in: [\_spine/core.d.ts:1029](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1029)

***

### kind

> `readonly` **kind**: `K`

Defined in: [\_spine/core.d.ts:1030](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1030)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:877](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L877)

#### Inherited from

`Omit.lifetime`

## Methods

### envelope()

> **envelope**(): [`CellEnvelope`](CellEnvelope.md)\<`K`, `T`\>

Defined in: [\_spine/core.d.ts:1028](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1028)

#### Returns

[`CellEnvelope`](CellEnvelope.md)\<`K`, `T`\>

***

### publishCrossing()

> **publishCrossing**(`crossing`): `void`

Defined in: [\_spine/core.d.ts:1031](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1031)

#### Parameters

##### crossing

[`BoundaryCrossing`](../type-aliases/BoundaryCrossing.md)\<`string`\>

#### Returns

`void`

***

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:873](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L873)

#### Returns

`T`

#### Inherited from

`Omit.read`

***

### set()

> **set**(`value`): `void`

Defined in: [\_spine/core.d.ts:874](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L874)

#### Parameters

##### value

`T`

#### Returns

`void`

#### Inherited from

`Omit.set`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

Defined in: [\_spine/core.d.ts:876](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L876)

#### Parameters

##### subscriber

[`Subscriber`](../namespaces/CellKernel/type-aliases/Subscriber.md)\<`T`\>

#### Returns

[`Disposer`](../namespaces/CellKernel/type-aliases/Disposer.md)

#### Inherited from

`Omit.subscribe`

***

### update()

> **update**(`f`): `void`

Defined in: [\_spine/core.d.ts:875](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L875)

#### Parameters

##### f

(`current`) => `T`

#### Returns

`void`

#### Inherited from

`Omit.update`
