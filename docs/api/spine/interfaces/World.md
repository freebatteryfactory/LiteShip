[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / World

# Interface: World

Defined in: [\_spine/core.d.ts:597](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L597)

Live ECS world that owns entities, dense stores, and scheduled systems.

## Methods

### addComponent()

> **addComponent**\<`T`\>(`id`, `component`, `value`): `void`

Defined in: [\_spine/core.d.ts:600](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L600)

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

Defined in: [\_spine/core.d.ts:606](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L606)

#### Parameters

##### store

[`DenseStore`](DenseStore.md)

#### Returns

`void`

***

### addSystem()

> **addSystem**(`system`): `void`

Defined in: [\_spine/core.d.ts:605](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L605)

#### Parameters

##### system

[`System`](System.md)

#### Returns

`void`

***

### despawn()

> **despawn**(`id`): `void`

Defined in: [\_spine/core.d.ts:599](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L599)

#### Parameters

##### id

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`void`

***

### query()

> **query**(...`componentNames`): readonly [`Entity`](Entity.md)[]

Defined in: [\_spine/core.d.ts:604](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L604)

#### Parameters

##### componentNames

...`string`[]

#### Returns

readonly [`Entity`](Entity.md)[]

***

### removeComponent()

> **removeComponent**(`id`, `name`): `void`

Defined in: [\_spine/core.d.ts:603](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L603)

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

Defined in: [\_spine/core.d.ts:602](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L602)

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

Defined in: [\_spine/core.d.ts:598](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L598)

#### Parameters

##### components?

`Record`\<`string`, `unknown`\>

#### Returns

[`EntityId`](../type-aliases/EntityId.md)

***

### tick()

> **tick**(): `void`

Defined in: [\_spine/core.d.ts:607](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L607)

#### Returns

`void`
