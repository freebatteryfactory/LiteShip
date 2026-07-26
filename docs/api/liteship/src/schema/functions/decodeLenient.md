[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / decodeLenient

# Function: decodeLenient()

> **decodeLenient**\<`A`, `I`\>(`schema`, `input`): `A` \| `null`

Defined in: core/dist/schema/decode.d.ts:51

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
