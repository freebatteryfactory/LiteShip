[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / interpolate

# Function: interpolate()

> **interpolate**\<`T`\>(`from`, `to`, `eased`, `defaults?`): `T`

Defined in: [core/src/interpolate.ts:167](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpolate.ts#L167)

Interpolate between two numeric records using an eased value [0..1].
Returns a new record with each property lerped: from[k] + (to[k] - from[k]) * eased.

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `number`\>

## Parameters

### from

`T`

### to

`T`

### eased

`number`

### defaults?

`Partial`\<`Record`\<`string`, `number`\>\>

## Returns

`T`
