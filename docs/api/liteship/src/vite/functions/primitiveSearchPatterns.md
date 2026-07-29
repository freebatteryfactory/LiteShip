[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / primitiveSearchPatterns

# Function: primitiveSearchPatterns()

> **primitiveSearchPatterns**(`kind`, `fromFile`, `projectRoot`, `userDir?`): readonly `string`[]

Defined in: vite/dist/primitive-resolve.d.ts:55

The candidate module patterns [resolvePrimitive](resolvePrimitive.md) searches for a
given lookup, in search order (e.g. `src/tokens.ts`, `src/*.tokens.ts`,
`tokens.ts`, `*.tokens.ts`). Used to make "could not resolve"
diagnostics name the exact places that were searched.

## Parameters

### kind

[`PrimitiveKind`](../../../../vite/src/type-aliases/PrimitiveKind.md)

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
