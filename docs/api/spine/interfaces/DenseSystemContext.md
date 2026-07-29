[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / DenseSystemContext

# Interface: DenseSystemContext\<R, W\>

Defined in: [\_spine/core.d.ts:849](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L849)

Part-authorized dense stores supplied to one dense system.

## Type Parameters

### R

`R` *extends* readonly [`Part`](Part.md)\<`number`\>[]

### W

`W` *extends* readonly [`Part`](Part.md)\<`number`\>[]

## Methods

### read()

> **read**\<`P`\>(`part`): [`DenseStore`](DenseStore.md)\<`P`\>

Defined in: [\_spine/core.d.ts:850](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L850)

#### Type Parameters

##### P

`P` *extends* [`Part`](Part.md)\<`number`, `string`, `unknown`\>

#### Parameters

##### part

`P`

#### Returns

[`DenseStore`](DenseStore.md)\<`P`\>

***

### write()

> **write**\<`P`\>(`part`): [`DenseStoreWriter`](DenseStoreWriter.md)\<`P`\>

Defined in: [\_spine/core.d.ts:851](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L851)

#### Type Parameters

##### P

`P` *extends* [`Part`](Part.md)\<`number`, `string`, `unknown`\>

#### Parameters

##### part

`P`

#### Returns

[`DenseStoreWriter`](DenseStoreWriter.md)\<`P`\>
