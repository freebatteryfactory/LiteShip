[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / RuntimeCoordinatorDenseStore

# Interface: RuntimeCoordinatorDenseStore

Defined in: [\_spine/core.d.ts:1056](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1056)

Internal dense numeric-store projection carried by the coordinator.

## Properties

### \_dense

> `readonly` **\_dense**: `true`

Defined in: [\_spine/core.d.ts:1059](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1059)

***

### capacity

> `readonly` **capacity**: `number`

Defined in: [\_spine/core.d.ts:1058](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1058)

***

### count

> **count**: `number`

Defined in: [\_spine/core.d.ts:1063](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1063)

***

### data

> `readonly` **data**: `Float64Array`

Defined in: [\_spine/core.d.ts:1062](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1062)

***

### entityToIndex

> `readonly` **entityToIndex**: [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)\<[`EntityId`](../type-aliases/EntityId.md), `number`\>

Defined in: [\_spine/core.d.ts:1060](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1060)

***

### indexToEntity

> `readonly` **indexToEntity**: [`EntityId`](../type-aliases/EntityId.md)[]

Defined in: [\_spine/core.d.ts:1061](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1061)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/core.d.ts:1057](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1057)

## Methods

### delete()

> **delete**(`entityId`): `boolean`

Defined in: [\_spine/core.d.ts:1067](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1067)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`boolean`

***

### entities()

> **entities**(): readonly [`EntityId`](../type-aliases/EntityId.md)[]

Defined in: [\_spine/core.d.ts:1070](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1070)

#### Returns

readonly [`EntityId`](../type-aliases/EntityId.md)[]

***

### get()

> **get**(`entityId`): `number` \| `undefined`

Defined in: [\_spine/core.d.ts:1064](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1064)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`number` \| `undefined`

***

### has()

> **has**(`entityId`): `boolean`

Defined in: [\_spine/core.d.ts:1066](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1066)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`boolean`

***

### reset()

> **reset**(): `void`

Defined in: [\_spine/core.d.ts:1068](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1068)

#### Returns

`void`

***

### set()

> **set**(`entityId`, `value`): `void`

Defined in: [\_spine/core.d.ts:1065](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1065)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

##### value

`number`

#### Returns

`void`

***

### view()

> **view**(): `Float64Array`

Defined in: [\_spine/core.d.ts:1069](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1069)

#### Returns

`Float64Array`
