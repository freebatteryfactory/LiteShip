[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / TypeExportSurfaceSnapshot

# Interface: TypeExportSurfaceSnapshot

Defined in: [audit/src/type-export-surface.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L64)

The committed type-export surface across a roster of packages.

## Properties

### packages

> `readonly` **packages**: `Readonly`\<`Record`\<`string`, [`PackageTypeSurface`](PackageTypeSurface.md)\>\>

Defined in: [audit/src/type-export-surface.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L67)

***

### snapshotFormat

> `readonly` **snapshotFormat**: `1`

Defined in: [audit/src/type-export-surface.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L66)

Bumped only if the descriptor schema itself changes.
