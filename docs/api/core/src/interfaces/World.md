[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / World

# Interface: World

Defined in: [core/src/ecs.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L186)

A live ECS world that owns entities, component stores, and ordered systems.

## Methods

### addComponent()

> **addComponent**\<`T`\>(`id`, `component`, `value`): `void`

Defined in: [core/src/ecs.ts:189](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L189)

#### Type Parameters

##### T

`T`

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

##### component

[`Part`](Part.md)\<`T`\>

##### value

`T`

#### Returns

`void`

***

### addDenseStore()

> **addDenseStore**(`store`): `void`

Defined in: [core/src/ecs.ts:197](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L197)

Register a dense store so the world can wire it into dense systems

#### Parameters

##### store

[`DenseStore`](DenseStore.md)

#### Returns

`void`

***

### addSystem()

> **addSystem**(`system`): `void`

Defined in: [core/src/ecs.ts:194](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L194)

#### Parameters

##### system

`AnySystem`

#### Returns

`void`

***

### despawn()

> **despawn**(`id`): `void`

Defined in: [core/src/ecs.ts:188](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L188)

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`void`

***

### query()

> **query**(...`componentNames`): readonly [`Entity`](Entity.md)[]

Defined in: [core/src/ecs.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L193)

#### Parameters

##### componentNames

...`string`[]

#### Returns

readonly [`Entity`](Entity.md)[]

***

### removeComponent()

> **removeComponent**(`id`, `name`): `void`

Defined in: [core/src/ecs.ts:192](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L192)

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

##### name

`string`

#### Returns

`void`

***

### setComponent()

> **setComponent**(`id`, `name`, `value`): `void`

Defined in: [core/src/ecs.ts:191](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L191)

Schema-free component write — used by systems to persist computed output values.

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

##### name

`string`

##### value

`unknown`

#### Returns

`void`

***

### spawn()

> **spawn**(`components?`): [`EntityId`](../type-aliases/EntityId.md)

Defined in: [core/src/ecs.ts:187](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L187)

#### Parameters

##### components?

`Record`\<`string`, `unknown`\>

#### Returns

[`EntityId`](../type-aliases/EntityId.md)

***

### tick()

> **tick**(): `void`

Defined in: [core/src/ecs.ts:195](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L195)

#### Returns

`void`
