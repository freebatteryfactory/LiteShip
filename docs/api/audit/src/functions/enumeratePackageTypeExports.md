[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / enumeratePackageTypeExports

# Function: enumeratePackageTypeExports()

> **enumeratePackageTypeExports**(`entryFile`, `reader?`): readonly [`TypeExportDescriptor`](../interfaces/TypeExportDescriptor.md)[]

Defined in: [audit/src/type-export-surface.ts:273](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L273)

Enumerate a package's PUBLIC type surface from `entryFile`, following relative
`export *` re-exports AND resolving the TYPE half of plain named re-exports
(value+type duals, re-exported namespaces/interfaces — the blind spot a
type-only-specifier scan left open). Deterministic — the result is de-duplicated
by `(name, kind)` and sorted by name then kind.

## Parameters

### entryFile

`string`

### reader?

[`SurfaceReader`](../interfaces/SurfaceReader.md) = `DEFAULT_SURFACE_READER`

## Returns

readonly [`TypeExportDescriptor`](../interfaces/TypeExportDescriptor.md)[]
