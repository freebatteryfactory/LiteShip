[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / buildTypeExportSurface

# Function: buildTypeExportSurface()

> **buildTypeExportSurface**(`roster`, `reader?`): [`TypeExportSurfaceSnapshot`](../interfaces/TypeExportSurfaceSnapshot.md)

Defined in: [audit/src/type-export-surface.ts:296](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L296)

Build the type-export surface across a roster of packages. The roster is
host-supplied (policy-free — the engine names no roster of its own); entries are
enumerated in name order.

## Parameters

### roster

readonly [`TypeExportRosterEntry`](../interfaces/TypeExportRosterEntry.md)[]

### reader?

[`SurfaceReader`](../interfaces/SurfaceReader.md) = `DEFAULT_SURFACE_READER`

## Returns

[`TypeExportSurfaceSnapshot`](../interfaces/TypeExportSurfaceSnapshot.md)
