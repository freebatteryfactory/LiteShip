[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / diffTypeExportSurface

# Function: diffTypeExportSurface()

> **diffTypeExportSurface**(`committed`, `live`): readonly [`TypeExportDrift`](../interfaces/TypeExportDrift.md)[]

Defined in: [audit/src/type-export-surface.ts:335](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L335)

Per-type diff of two surfaces — the human-readable drift report the gate prints
so a reviewer sees exactly which type left or entered the surface (the CapSet
class of slip, now named rather than buried in a byte diff).

## Parameters

### committed

[`TypeExportSurfaceSnapshot`](../interfaces/TypeExportSurfaceSnapshot.md)

### live

[`TypeExportSurfaceSnapshot`](../interfaces/TypeExportSurfaceSnapshot.md)

## Returns

readonly [`TypeExportDrift`](../interfaces/TypeExportDrift.md)[]
