[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / withArbitrary

# Function: withArbitrary()

> **withArbitrary**\<`S2`\>(`schema`, `arbitrary`): `S2`

Defined in: [core/src/schema/constructors.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/constructors.ts#L158)

Attach an author-supplied `fast-check` arbitrary THUNK to a schema (for the
harness walker). Returns a fresh schema with the same decode/encode behaviour
— only its sampling changes. Use it to sample a narrow valid domain a
structural walk cannot reach (e.g. canonical CBOR bytes ⊂ `Uint8Array`).

## Type Parameters

### S2

`S2` *extends* [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>

## Parameters

### schema

`S2`

### arbitrary

() => `unknown`

## Returns

`S2`
