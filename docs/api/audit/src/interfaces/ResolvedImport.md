[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / ResolvedImport

# Interface: ResolvedImport

Defined in: [audit/src/structure.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/structure.ts#L68)

A specifier resolved against the package-export targets — the structure pass's
module-graph edge model. Exported so the Slice-B repo-IR builder
(`repo-ir-build.ts`) materializes import edges from the SAME resolver, never a
divergent fork (the drift this slice fights).

## Properties

### kind

> `readonly` **kind**: `"relative"` \| `"internal-package"` \| `"external"`

Defined in: [audit/src/structure.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/structure.ts#L72)

***

### specifier

> `readonly` **specifier**: `string`

Defined in: [audit/src/structure.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/structure.ts#L69)

***

### targetFile

> `readonly` **targetFile**: `string` \| `null`

Defined in: [audit/src/structure.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/structure.ts#L70)

***

### targetPackage

> `readonly` **targetPackage**: `string` \| `null`

Defined in: [audit/src/structure.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/structure.ts#L71)
