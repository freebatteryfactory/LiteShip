[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / DenseSystem

# Interface: DenseSystem\<R, W\>

Defined in: [\_spine/core.d.ts:855](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L855)

ECS system that operates on dense-packed component stores.

## Type Parameters

### R

`R` *extends* readonly [`Part`](Part.md)\<`number`\>[] = readonly [`Part`](Part.md)\<`number`\>[]

### W

`W` *extends* readonly [`Part`](Part.md)\<`number`\>[] = readonly [`Part`](Part.md)\<`number`\>[]

## Properties

### \_denseSystem

> `readonly` **\_denseSystem**: `true`

Defined in: [\_spine/core.d.ts:862](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L862)

***

### \[SpineDenseSystemWitness\]

> `readonly` **\[SpineDenseSystemWitness\]**: `true`

Defined in: [\_spine/core.d.ts:864](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L864)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/core.d.ts:859](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L859)

***

### reads

> `readonly` **reads**: `R`

Defined in: [\_spine/core.d.ts:860](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L860)

***

### writes

> `readonly` **writes**: `W`

Defined in: [\_spine/core.d.ts:861](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L861)

## Methods

### execute()

> **execute**(`context`): `void`

Defined in: [\_spine/core.d.ts:863](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L863)

#### Parameters

##### context

[`DenseSystemContext`](DenseSystemContext.md)\<`R`, `W`\>

#### Returns

`void`
