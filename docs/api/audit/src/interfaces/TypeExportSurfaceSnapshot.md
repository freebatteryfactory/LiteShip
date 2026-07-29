[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / TypeExportSurfaceSnapshot

# Interface: TypeExportSurfaceSnapshot

Defined in: [audit/src/type-export-surface.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L66)

The committed type-export surface across a roster of packages.

## Properties

### packages

> `readonly` **packages**: `Readonly`\<`Record`\<`string`, [`PackageTypeSurface`](PackageTypeSurface.md)\>\>

Defined in: [audit/src/type-export-surface.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L69)

***

### snapshotFormat

> `readonly` **snapshotFormat**: `1`

Defined in: [audit/src/type-export-surface.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/type-export-surface.ts#L68)

Bumped only if the descriptor schema itself changes.
