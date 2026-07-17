[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ComposableWorldShape

# Interface: ComposableWorldShape\<Schema\>

Defined in: [core/src/composable.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/composable.ts#L116)

## Type Parameters

### Schema

`Schema` *extends* [`EntityComponents`](EntityComponents.md) = [`EntityComponents`](EntityComponents.md)

## Methods

### evaluate()

> **evaluate**\<`T`\>(`entity`, `input`): `Record`\<`string`, `string`\>

Defined in: [core/src/composable.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/composable.ts#L120)

#### Type Parameters

##### T

`T` *extends* [`EntityComponents`](EntityComponents.md)

#### Parameters

##### entity

[`ComposableEntity`](ComposableEntity.md)\<`T`\>

##### input

`Record`\<`string`, `number`\>

#### Returns

`Record`\<`string`, `string`\>

***

### query()

> **query**\<`K`\>(...`componentTypes`): readonly [`ComposableEntity`](ComposableEntity.md)\<`Pick`\<`Schema`, `K`\>\>[]

Defined in: [core/src/composable.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/composable.ts#L119)

#### Type Parameters

##### K

`K` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### componentTypes

...`K`[]

#### Returns

readonly [`ComposableEntity`](ComposableEntity.md)\<`Pick`\<`Schema`, `K`\>\>[]

***

### spawn()

> **spawn**\<`T`\>(`components`): [`ComposableEntity`](ComposableEntity.md)\<`T`\>

Defined in: [core/src/composable.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/composable.ts#L117)

#### Type Parameters

##### T

`T` *extends* [`EntityComponents`](EntityComponents.md)

#### Parameters

##### components

`T`

#### Returns

[`ComposableEntity`](ComposableEntity.md)\<`T`\>

***

### spawnWith()

> **spawnWith**\<`T`\>(`entity`): [`ComposableEntity`](ComposableEntity.md)\<`T`\>

Defined in: [core/src/composable.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/composable.ts#L118)

#### Type Parameters

##### T

`T` *extends* [`EntityComponents`](EntityComponents.md)

#### Parameters

##### entity

[`ComposableEntity`](ComposableEntity.md)\<`T`\>

#### Returns

[`ComposableEntity`](ComposableEntity.md)\<`T`\>
