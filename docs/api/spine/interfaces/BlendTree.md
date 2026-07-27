[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / BlendTree

# Interface: BlendTree\<T\>

Defined in: [\_spine/core.d.ts:480](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L480)

Mutable weighted blend graph over homogeneous numeric records.

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `number`\>

## Properties

### changes

> `readonly` **changes**: `Pick`\<[`Fanout`](../namespaces/CellKernel/interfaces/Fanout.md)\<`T`\>, `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/core.d.ts:486](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L486)

No-replay subscribe surface of the tree's [CellKernel](../namespaces/CellKernel/README.md) fan-out channel.

## Methods

### add()

> **add**(`name`, `value`, `weight`): `void`

Defined in: [\_spine/core.d.ts:481](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L481)

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

Defined in: [\_spine/core.d.ts:484](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L484)

#### Returns

`T`

***

### remove()

> **remove**(`name`): `void`

Defined in: [\_spine/core.d.ts:482](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L482)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### setWeight()

> **setWeight**(`name`, `weight`): `void`

Defined in: [\_spine/core.d.ts:483](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L483)

#### Parameters

##### name

`string`

##### weight

`number`

#### Returns

`void`
