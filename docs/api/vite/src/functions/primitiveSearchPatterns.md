[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / primitiveSearchPatterns

# Function: primitiveSearchPatterns()

> **primitiveSearchPatterns**(`kind`, `fromFile`, `projectRoot`, `userDir?`): readonly `string`[]

Defined in: [vite/src/primitive-resolve.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/primitive-resolve.ts#L85)

The candidate module patterns [resolvePrimitive](resolvePrimitive.md) searches for a
given lookup, in search order (e.g. `src/tokens.ts`, `src/*.tokens.ts`,
`tokens.ts`, `*.tokens.ts`). Used to make "could not resolve"
diagnostics name the exact places that were searched.

## Parameters

### kind

[`PrimitiveKind`](../type-aliases/PrimitiveKind.md)

Primitive kind being resolved.

### fromFile

`string`

Path of the file that triggered the lookup.

### projectRoot

`string`

Vite project root (search fallback).

### userDir?

`string`

Optional override directory (searched first).

## Returns

readonly `string`[]
