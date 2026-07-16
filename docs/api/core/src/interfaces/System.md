[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / System

# Interface: System

Defined in: [core/src/ecs.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L166)

## Properties

### \_denseSystem?

> `readonly` `optional` **\_denseSystem?**: `undefined`

Defined in: [core/src/ecs.ts:169](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L169)

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/ecs.ts:167](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L167)

***

### query

> `readonly` **query**: readonly `string`[]

Defined in: [core/src/ecs.ts:168](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L168)

## Methods

### execute()

> **execute**(`entities`, `world?`): `Effect`\<`void`\>

Defined in: [core/src/ecs.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L171)

Second argument is the world — use it to write computed output components back.

#### Parameters

##### entities

readonly [`Entity`](Entity.md)[]

##### world?

`WorldShape`

#### Returns

`Effect`\<`void`\>
