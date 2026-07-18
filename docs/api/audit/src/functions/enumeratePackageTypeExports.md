[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / enumeratePackageTypeExports

# Function: enumeratePackageTypeExports()

> **enumeratePackageTypeExports**(`entryFile`, `reader?`): readonly [`TypeExportDescriptor`](../interfaces/TypeExportDescriptor.md)[]

Defined in: [audit/src/type-export-surface.ts:197](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L197)

Enumerate a package's PUBLIC type surface: BFS from `entryFile` over relative
`export *` re-exports, collecting every exported type. Deterministic — the
result is de-duplicated by `(name, kind)` and sorted by name then kind.

## Parameters

### entryFile

`string`

### reader?

[`SurfaceReader`](../interfaces/SurfaceReader.md) = `DEFAULT_SURFACE_READER`

## Returns

readonly [`TypeExportDescriptor`](../interfaces/TypeExportDescriptor.md)[]
