[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ComposableWorldShape

# Interface: ComposableWorldShape\<Schema\>

Defined in: [core/src/authoring/composable.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/composable.ts#L120)

## Type Parameters

### Schema

`Schema` *extends* [`EntityComponents`](EntityComponents.md) = [`EntityComponents`](EntityComponents.md)

## Methods

### evaluate()

> **evaluate**\<`T`\>(`entity`, `input`): `Record`\<`string`, `string`\>

Defined in: [core/src/authoring/composable.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/composable.ts#L124)

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

Defined in: [core/src/authoring/composable.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/composable.ts#L123)

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

Defined in: [core/src/authoring/composable.ts:121](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/composable.ts#L121)

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

Defined in: [core/src/authoring/composable.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/composable.ts#L122)

#### Type Parameters

##### T

`T` *extends* [`EntityComponents`](EntityComponents.md)

#### Parameters

##### entity

[`ComposableEntity`](ComposableEntity.md)\<`T`\>

#### Returns

[`ComposableEntity`](ComposableEntity.md)\<`T`\>
