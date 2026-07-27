[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / DenseStore

# Interface: DenseStore\<P\>

Defined in: [\_spine/core.d.ts:809](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L809)

Dense, fixed-capacity numeric ECS component storage.

## Type Parameters

### P

`P` *extends* [`Part`](Part.md)\<`number`\> = [`Part`](Part.md)\<`number`\>

## Properties

### \_dense

> `readonly` **\_dense**: `true`

Defined in: [\_spine/core.d.ts:813](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L813)

***

### capacity

> `readonly` **capacity**: `number`

Defined in: [\_spine/core.d.ts:812](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L812)

***

### count

> `readonly` **count**: `number`

Defined in: [\_spine/core.d.ts:816](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L816)

***

### entityToIndex

> `readonly` **entityToIndex**: `ReadonlyMap`\<[`EntityId`](../type-aliases/EntityId.md), `number`\>

Defined in: [\_spine/core.d.ts:814](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L814)

***

### indexToEntity

> `readonly` **indexToEntity**: readonly [`EntityId`](../type-aliases/EntityId.md)[]

Defined in: [\_spine/core.d.ts:815](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L815)

***

### name

> `readonly` **name**: `P`\[`"name"`\]

Defined in: [\_spine/core.d.ts:811](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L811)

***

### part

> `readonly` **part**: `P`

Defined in: [\_spine/core.d.ts:810](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L810)

## Methods

### entities()

> **entities**(): readonly [`EntityId`](../type-aliases/EntityId.md)[]

Defined in: [\_spine/core.d.ts:820](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L820)

#### Returns

readonly [`EntityId`](../type-aliases/EntityId.md)[]

***

### get()

> **get**(`entityId`): `number` \| `undefined`

Defined in: [\_spine/core.d.ts:817](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L817)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`number` \| `undefined`

***

### has()

> **has**(`entityId`): `boolean`

Defined in: [\_spine/core.d.ts:818](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L818)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`boolean`

***

### view()

> **view**(): [`ReadonlyDenseValues`](ReadonlyDenseValues.md)

Defined in: [\_spine/core.d.ts:819](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L819)

#### Returns

[`ReadonlyDenseValues`](ReadonlyDenseValues.md)
