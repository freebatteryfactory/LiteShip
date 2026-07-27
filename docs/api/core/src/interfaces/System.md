[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / System

# Interface: System

Defined in: [core/src/ecs.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L171)

A system that processes entities matching a component-name query.

## Properties

### \_denseSystem?

> `readonly` `optional` **\_denseSystem?**: `undefined`

Defined in: [core/src/ecs.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L174)

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/ecs.ts:172](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L172)

***

### query

> `readonly` **query**: readonly `string`[]

Defined in: [core/src/ecs.ts:173](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L173)

## Methods

### execute()

> **execute**(`entities`, `world?`): `void`

Defined in: [core/src/ecs.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L176)

Second argument is the world — use it to write computed output components back.

#### Parameters

##### entities

readonly [`Entity`](Entity.md)[]

##### world?

[`World`](World.md)

#### Returns

`void`
