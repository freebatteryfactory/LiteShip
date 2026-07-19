[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / buildTypeExportSurface

# Function: buildTypeExportSurface()

> **buildTypeExportSurface**(`roster`, `reader?`): [`TypeExportSurfaceSnapshot`](../interfaces/TypeExportSurfaceSnapshot.md)

Defined in: [audit/src/type-export-surface.ts:293](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L293)

Build the type-export surface across a roster of packages. The roster is
host-supplied (policy-free, ADR-0012); entries are enumerated in name order.

## Parameters

### roster

readonly [`TypeExportRosterEntry`](../interfaces/TypeExportRosterEntry.md)[]

### reader?

[`SurfaceReader`](../interfaces/SurfaceReader.md) = `DEFAULT_SURFACE_READER`

## Returns

[`TypeExportSurfaceSnapshot`](../interfaces/TypeExportSurfaceSnapshot.md)
