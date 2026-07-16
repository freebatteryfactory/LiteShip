[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DenseSystem

# Interface: DenseSystem

Defined in: [core/src/ecs.ts:151](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L151)

## Properties

### \_denseSystem

> `readonly` **\_denseSystem**: `true`

Defined in: [core/src/ecs.ts:154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L154)

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/ecs.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L152)

***

### query

> `readonly` **query**: readonly `string`[]

Defined in: [core/src/ecs.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L153)

## Methods

### execute()

> **execute**(`stores`): `Effect`\<`void`\>

Defined in: [core/src/ecs.ts:159](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L159)

Execute receives dense stores keyed by component name.
Systems iterate the typed arrays directly -- zero allocation per tick.

#### Parameters

##### stores

`ReadonlyMap`\<`string`, [`DenseStore`](DenseStore.md)\>

#### Returns

`Effect`\<`void`\>
