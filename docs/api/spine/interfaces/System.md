[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / System

# Interface: System

Defined in: [\_spine/core.d.ts:589](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L589)

ECS system that evaluates entities matching a component-name query.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [\_spine/core.d.ts:590](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L590)

***

### query

> `readonly` **query**: readonly `string`[]

Defined in: [\_spine/core.d.ts:591](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L591)

## Methods

### execute()

> **execute**(`entities`, `world?`): `void`

Defined in: [\_spine/core.d.ts:593](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L593)

Second argument is the world — use it to write computed output components back.

#### Parameters

##### entities

readonly [`Entity`](Entity.md)[]

##### world?

[`World`](World.md)

#### Returns

`void`
