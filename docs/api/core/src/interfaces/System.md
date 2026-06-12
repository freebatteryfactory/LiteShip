[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / System

# Interface: System

Defined in: [core/src/ecs.ts:165](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ecs.ts#L165)

## Properties

### \_denseSystem?

> `readonly` `optional` **\_denseSystem?**: `undefined`

Defined in: [core/src/ecs.ts:168](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ecs.ts#L168)

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/ecs.ts:166](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ecs.ts#L166)

***

### query

> `readonly` **query**: readonly `string`[]

Defined in: [core/src/ecs.ts:167](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ecs.ts#L167)

## Methods

### execute()

> **execute**(`entities`, `world?`): `Effect`\<`void`\>

Defined in: [core/src/ecs.ts:170](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ecs.ts#L170)

Second argument is the world — use it to write computed output components back.

#### Parameters

##### entities

readonly [`Entity`](Entity.md)[]

##### world?

`WorldShape`

#### Returns

`Effect`\<`void`\>
