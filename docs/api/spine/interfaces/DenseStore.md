[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / DenseStore

# Interface: DenseStore

Defined in: [\_spine/core.d.ts:623](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L623)

Dense, fixed-capacity numeric ECS component storage.

## Properties

### \_dense

> `readonly` **\_dense**: `true`

Defined in: [\_spine/core.d.ts:626](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L626)

***

### capacity

> `readonly` **capacity**: `number`

Defined in: [\_spine/core.d.ts:625](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L625)

***

### count

> **count**: `number`

Defined in: [\_spine/core.d.ts:630](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L630)

***

### data

> `readonly` **data**: `Float64Array`

Defined in: [\_spine/core.d.ts:629](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L629)

***

### entityToIndex

> `readonly` **entityToIndex**: [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)\<[`EntityId`](../type-aliases/EntityId.md), `number`\>

Defined in: [\_spine/core.d.ts:627](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L627)

***

### indexToEntity

> `readonly` **indexToEntity**: [`EntityId`](../type-aliases/EntityId.md)[]

Defined in: [\_spine/core.d.ts:628](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L628)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/core.d.ts:624](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L624)

## Methods

### delete()

> **delete**(`id`): `boolean`

Defined in: [\_spine/core.d.ts:633](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L633)

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`boolean`

***

### entities()

> **entities**(): readonly [`EntityId`](../type-aliases/EntityId.md)[]

Defined in: [\_spine/core.d.ts:637](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L637)

#### Returns

readonly [`EntityId`](../type-aliases/EntityId.md)[]

***

### get()

> **get**(`id`): `number` \| `undefined`

Defined in: [\_spine/core.d.ts:631](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L631)

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`number` \| `undefined`

***

### has()

> **has**(`id`): `boolean`

Defined in: [\_spine/core.d.ts:634](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L634)

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`boolean`

***

### reset()

> **reset**(): `void`

Defined in: [\_spine/core.d.ts:635](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L635)

#### Returns

`void`

***

### set()

> **set**(`id`, `value`): `void`

Defined in: [\_spine/core.d.ts:632](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L632)

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

##### value

`number`

#### Returns

`void`

***

### view()

> **view**(): `Float64Array`

Defined in: [\_spine/core.d.ts:636](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L636)

#### Returns

`Float64Array`
