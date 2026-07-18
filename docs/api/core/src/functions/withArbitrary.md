[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / withArbitrary

# Function: withArbitrary()

> **withArbitrary**\<`S2`\>(`schema`, `arbitrary`): `S2`

Defined in: [core/src/schema/constructors.ts:183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/constructors.ts#L183)

Attach an author-supplied arbitrary THUNK to a schema (for the harness
walker). Returns a fresh schema with the same decode/encode behaviour — only
its sampling changes. Use it to sample a narrow valid domain a structural walk
cannot reach (e.g. canonical CBOR bytes ⊂ `Uint8Array`).

The thunk receives `fast-check` as its argument — PROVIDED by the harness that
realizes the arbitrary (`@czap/core/harness`), so the schema kernel and its
capsules declare the arbitrary CONTRACT without importing the property-testing
engine. Importing `@czap/core` therefore never loads `fast-check`; the testing
integration owns the realization. The param is typed `unknown` (cast to the
`fast-check` module inside the thunk) so no `fast-check` type reaches the
public surface.

## Type Parameters

### S2

`S2` *extends* [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>

## Parameters

### schema

`S2`

### arbitrary

(`fc`) => `unknown`

## Returns

`S2`
