[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / StructureSummary

# Interface: StructureSummary

Defined in: [audit/src/structure.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L30)

## Properties

### coverageClassification

> `readonly` **coverageClassification**: [`StructureCoverageClassification`](StructureCoverageClassification.md)

Defined in: [audit/src/structure.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L48)

Audit self-trust classification (CUT A0): how each structure check was
actually evaluated, so `0` findings cannot be read as proof where the check
is policy-absent or only a file-level proxy.

***

### defaultExportCount

> `readonly` **defaultExportCount**: `number`

Defined in: [audit/src/structure.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L37)

***

### externalImportCount

> `readonly` **externalImportCount**: `number`

Defined in: [audit/src/structure.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L34)

***

### internalImportEdges

> `readonly` **internalImportEdges**: `number`

Defined in: [audit/src/structure.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L33)

***

### orphanCandidateCount

> `readonly` **orphanCandidateCount**: `number`

Defined in: [audit/src/structure.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L36)

***

### packageCount

> `readonly` **packageCount**: `number`

Defined in: [audit/src/structure.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L31)

***

### packageEdges

> `readonly` **packageEdges**: readonly `object`[]

Defined in: [audit/src/structure.ts:38](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L38)

***

### publicExportCount

> `readonly` **publicExportCount**: `number`

Defined in: [audit/src/structure.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L35)

***

### sourceFileCount

> `readonly` **sourceFileCount**: `number`

Defined in: [audit/src/structure.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L32)
