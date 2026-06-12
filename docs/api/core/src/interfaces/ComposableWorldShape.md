[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ComposableWorldShape

# Interface: ComposableWorldShape\<Schema\>

Defined in: [core/src/composable.ts:147](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/composable.ts#L147)

## Type Parameters

### Schema

`Schema` *extends* [`EntityComponents`](EntityComponents.md) = [`EntityComponents`](EntityComponents.md)

## Methods

### evaluate()

> **evaluate**\<`T`\>(`entity`, `input`): `Effect`\<`Record`\<`string`, `string`\>\>

Defined in: [core/src/composable.ts:151](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/composable.ts#L151)

#### Type Parameters

##### T

`T` *extends* [`EntityComponents`](EntityComponents.md)

#### Parameters

##### entity

[`ComposableEntity`](ComposableEntity.md)\<`T`\>

##### input

`Record`\<`string`, `number`\>

#### Returns

`Effect`\<`Record`\<`string`, `string`\>\>

***

### query()

> **query**\<`K`\>(...`componentTypes`): `Effect`\<readonly [`ComposableEntity`](ComposableEntity.md)\<`Pick`\<`Schema`, `K`\>\>[]\>

Defined in: [core/src/composable.ts:150](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/composable.ts#L150)

#### Type Parameters

##### K

`K` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### componentTypes

...`K`[]

#### Returns

`Effect`\<readonly [`ComposableEntity`](ComposableEntity.md)\<`Pick`\<`Schema`, `K`\>\>[]\>

***

### spawn()

> **spawn**\<`T`\>(`components`): `Effect`\<[`ComposableEntity`](ComposableEntity.md)\<`T`\>\>

Defined in: [core/src/composable.ts:148](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/composable.ts#L148)

#### Type Parameters

##### T

`T` *extends* [`EntityComponents`](EntityComponents.md)

#### Parameters

##### components

`T`

#### Returns

`Effect`\<[`ComposableEntity`](ComposableEntity.md)\<`T`\>\>

***

### spawnWith()

> **spawnWith**\<`T`\>(`entity`): `Effect`\<[`ComposableEntity`](ComposableEntity.md)\<`T`\>\>

Defined in: [core/src/composable.ts:149](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/composable.ts#L149)

#### Type Parameters

##### T

`T` *extends* [`EntityComponents`](EntityComponents.md)

#### Parameters

##### entity

[`ComposableEntity`](ComposableEntity.md)\<`T`\>

#### Returns

`Effect`\<[`ComposableEntity`](ComposableEntity.md)\<`T`\>\>
