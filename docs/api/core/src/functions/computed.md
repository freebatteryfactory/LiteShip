[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / computed

# Function: computed()

> **computed**\<`T`\>(`compute`, `sources?`): `DerivedShape`\<`T`\>

Defined in: [core/src/reactive/derived.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/derived.ts#L158)

Compute a derived value from a `compute` factory and the sources whose
emissions recompute it. With no sources it is static (never recomputes).

## Type Parameters

### T

`T`

## Parameters

### compute

() => `T`

### sources?

readonly `DerivedTrigger`[] = `[]`

## Returns

`DerivedShape`\<`T`\>
