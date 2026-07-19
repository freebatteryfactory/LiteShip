[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / decodeLenient

# Function: decodeLenient()

> **decodeLenient**\<`A`, `I`\>(`schema`, `input`): `A` \| `null`

Defined in: [core/src/schema/decode.ts:392](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L392)

LENIENT decode — coerce-or-null / prune. Returns the decoded `A`, or `null`
when a required leaf could not be produced. Malformed record/array leaves and
poison keys are pruned rather than fatal. Never throws.

## Type Parameters

### A

`A`

### I

`I`

## Parameters

### schema

[`Schema`](../interfaces/Schema.md)\<`A`, `I`\>

### input

`unknown`

## Returns

`A` \| `null`
