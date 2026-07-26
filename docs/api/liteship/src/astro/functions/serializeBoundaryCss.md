[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / serializeBoundaryCss

# Function: serializeBoundaryCss()

> **serializeBoundaryCss**(`resolution`): `string`

Defined in: astro/dist/fetch-layer.d.ts:68

Serialize a resolution's compiled boundary outputs into one stylesheet.

LAW 13 (SKILL §13): `CompiledOutputs.css` is the full ordered stylesheet —
`propertyRegistrations` / `containerQueries` are mirrors for KV identity,
not additive serialization parts. Emit only `css`.

## Parameters

### resolution

`EdgeHostResolution`

## Returns

`string`
