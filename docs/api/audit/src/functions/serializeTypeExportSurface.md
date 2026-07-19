[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / serializeTypeExportSurface

# Function: serializeTypeExportSurface()

> **serializeTypeExportSurface**(`snapshot`): `string`

Defined in: [audit/src/type-export-surface.ts:309](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L309)

Byte-canonical serialization of a type-export surface: package names sorted,
each descriptor emitted `name` → `kind` in fixed key order, 2-space indent,
trailing newline. Re-serializing a committed snapshot is a no-op.

## Parameters

### snapshot

[`TypeExportSurfaceSnapshot`](../interfaces/TypeExportSurfaceSnapshot.md)

## Returns

`string`
