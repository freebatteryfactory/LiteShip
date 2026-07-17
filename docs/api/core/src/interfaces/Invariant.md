[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Invariant

# Interface: Invariant\<In, Out\>

Defined in: [core/src/capsule.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L44)

A typed invariant over input and output that the harness will check.

## Type Parameters

### In

`In`

### Out

`Out`

## Properties

### check

> `readonly` **check**: (`input`, `output`) => `boolean`

Defined in: [core/src/capsule.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L46)

#### Parameters

##### input

`In`

##### output

`Out`

#### Returns

`boolean`

***

### message

> `readonly` **message**: `string`

Defined in: [core/src/capsule.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L47)

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/capsule.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L45)
