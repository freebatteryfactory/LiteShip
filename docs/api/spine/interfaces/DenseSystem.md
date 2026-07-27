[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / DenseSystem

# Interface: DenseSystem

Defined in: [\_spine/core.d.ts:644](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L644)

ECS system that operates on dense-packed component stores

## Properties

### \_denseSystem

> `readonly` **\_denseSystem**: `true`

Defined in: [\_spine/core.d.ts:647](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L647)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/core.d.ts:645](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L645)

***

### query

> `readonly` **query**: readonly `string`[]

Defined in: [\_spine/core.d.ts:646](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L646)

## Methods

### execute()

> **execute**(`stores`): `void`

Defined in: [\_spine/core.d.ts:648](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L648)

#### Parameters

##### stores

`ReadonlyMap`\<`string`, [`DenseStore`](DenseStore.md)\>

#### Returns

`void`
