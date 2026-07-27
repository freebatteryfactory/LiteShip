[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / BlendTree

# Interface: BlendTree\<T\>

Defined in: [\_spine/core.d.ts:507](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L507)

Mutable weighted blend graph over homogeneous numeric records.

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `number`\>

## Properties

### changes

> `readonly` **changes**: `Pick`\<[`Fanout`](../namespaces/CellKernel/interfaces/Fanout.md)\<`T`\>, `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/core.d.ts:513](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L513)

No-replay subscribe surface of the tree's [CellKernel](../namespaces/CellKernel/README.md) fan-out channel.

## Methods

### add()

> **add**(`name`, `value`, `weight`): `void`

Defined in: [\_spine/core.d.ts:508](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L508)

#### Parameters

##### name

`string`

##### value

`T`

##### weight

`number`

#### Returns

`void`

***

### compute()

> **compute**(): `T`

Defined in: [\_spine/core.d.ts:511](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L511)

#### Returns

`T`

***

### remove()

> **remove**(`name`): `void`

Defined in: [\_spine/core.d.ts:509](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L509)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### setWeight()

> **setWeight**(`name`, `weight`): `void`

Defined in: [\_spine/core.d.ts:510](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L510)

#### Parameters

##### name

`string`

##### weight

`number`

#### Returns

`void`
