[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / LiveCell

# Interface: LiveCell\<K, T\>

Defined in: [\_spine/core.d.ts:811](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L811)

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

Defined in: [\_spine/core.d.ts:812](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L812)

***

### crossings

> `readonly` **crossings**: `Pick`\<[`Fanout`](../namespaces/CellKernel/interfaces/Fanout.md)\<[`BoundaryCrossing`](../type-aliases/BoundaryCrossing.md)\<`string`\>\>, `"subscribe"`\>

Defined in: [\_spine/core.d.ts:814](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L814)

***

### kind

> `readonly` **kind**: `K`

Defined in: [\_spine/core.d.ts:815](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L815)

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:662](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L662)

#### Inherited from

`Omit.lifetime`

## Methods

### envelope()

> **envelope**(): [`CellEnvelope`](CellEnvelope.md)\<`K`, `T`\>

Defined in: [\_spine/core.d.ts:813](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L813)

#### Returns

[`CellEnvelope`](CellEnvelope.md)\<`K`, `T`\>

***

### publishCrossing()

> **publishCrossing**(`crossing`): `void`

Defined in: [\_spine/core.d.ts:816](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L816)

#### Parameters

##### crossing

[`BoundaryCrossing`](../type-aliases/BoundaryCrossing.md)\<`string`\>

#### Returns

`void`

***

### read()

> **read**(): `T`

Defined in: [\_spine/core.d.ts:658](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L658)

#### Returns

`T`

#### Inherited from

`Omit.read`

***

### set()

> **set**(`value`): `void`

Defined in: [\_spine/core.d.ts:659](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L659)

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

Defined in: [\_spine/core.d.ts:661](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L661)

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

Defined in: [\_spine/core.d.ts:660](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L660)

#### Parameters

##### f

(`current`) => `T`

#### Returns

`void`

#### Inherited from

`Omit.update`
