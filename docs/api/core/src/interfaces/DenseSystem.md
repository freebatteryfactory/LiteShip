[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DenseSystem

# Interface: DenseSystem

Defined in: [core/src/ecs.ts:155](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L155)

A system that operates directly over dense numeric stores.

## Properties

### \_denseSystem

> `readonly` **\_denseSystem**: `true`

Defined in: [core/src/ecs.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L158)

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/ecs.ts:156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L156)

***

### query

> `readonly` **query**: readonly `string`[]

Defined in: [core/src/ecs.ts:157](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L157)

## Methods

### execute()

> **execute**(`stores`): `void`

Defined in: [core/src/ecs.ts:163](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L163)

Execute receives dense stores keyed by component name.
Systems iterate the typed arrays directly -- zero allocation per tick.

#### Parameters

##### stores

`ReadonlyMap`\<`string`, [`DenseStore`](DenseStore.md)\>

#### Returns

`void`
