[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / RuntimeCoordinatorDenseStore

# Interface: RuntimeCoordinatorDenseStore

Defined in: [\_spine/core.d.ts:840](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L840)

Internal dense numeric-store projection carried by the coordinator.

## Properties

### \_dense

> `readonly` **\_dense**: `true`

Defined in: [\_spine/core.d.ts:843](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L843)

***

### capacity

> `readonly` **capacity**: `number`

Defined in: [\_spine/core.d.ts:842](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L842)

***

### count

> **count**: `number`

Defined in: [\_spine/core.d.ts:847](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L847)

***

### data

> `readonly` **data**: `Float64Array`

Defined in: [\_spine/core.d.ts:846](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L846)

***

### entityToIndex

> `readonly` **entityToIndex**: [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)\<[`EntityId`](../type-aliases/EntityId.md), `number`\>

Defined in: [\_spine/core.d.ts:844](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L844)

***

### indexToEntity

> `readonly` **indexToEntity**: [`EntityId`](../type-aliases/EntityId.md)[]

Defined in: [\_spine/core.d.ts:845](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L845)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/core.d.ts:841](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L841)

## Methods

### delete()

> **delete**(`entityId`): `boolean`

Defined in: [\_spine/core.d.ts:851](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L851)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`boolean`

***

### entities()

> **entities**(): readonly [`EntityId`](../type-aliases/EntityId.md)[]

Defined in: [\_spine/core.d.ts:854](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L854)

#### Returns

readonly [`EntityId`](../type-aliases/EntityId.md)[]

***

### get()

> **get**(`entityId`): `number` \| `undefined`

Defined in: [\_spine/core.d.ts:848](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L848)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`number` \| `undefined`

***

### has()

> **has**(`entityId`): `boolean`

Defined in: [\_spine/core.d.ts:850](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L850)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`boolean`

***

### reset()

> **reset**(): `void`

Defined in: [\_spine/core.d.ts:852](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L852)

#### Returns

`void`

***

### set()

> **set**(`entityId`, `value`): `void`

Defined in: [\_spine/core.d.ts:849](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L849)

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

Defined in: [\_spine/core.d.ts:853](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L853)

#### Returns

`Float64Array`
