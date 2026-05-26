[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / StructureSummary

# Interface: StructureSummary

Defined in: [audit/src/structure.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L31)

## Properties

### coverageClassification

> `readonly` **coverageClassification**: [`StructureCoverageClassification`](StructureCoverageClassification.md)

Defined in: [audit/src/structure.ts:49](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L49)

Audit self-trust classification (CUT A0): how each structure check was
actually evaluated, so `0` findings cannot be read as proof where the check
is policy-absent or only a file-level proxy.

***

### defaultExportCount

> `readonly` **defaultExportCount**: `number`

Defined in: [audit/src/structure.ts:38](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L38)

***

### externalImportCount

> `readonly` **externalImportCount**: `number`

Defined in: [audit/src/structure.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L35)

***

### internalImportEdges

> `readonly` **internalImportEdges**: `number`

Defined in: [audit/src/structure.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L34)

***

### orphanCandidateCount

> `readonly` **orphanCandidateCount**: `number`

Defined in: [audit/src/structure.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L37)

***

### packageCount

> `readonly` **packageCount**: `number`

Defined in: [audit/src/structure.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L32)

***

### packageEdges

> `readonly` **packageEdges**: readonly `object`[]

Defined in: [audit/src/structure.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L39)

***

### publicExportCount

> `readonly` **publicExportCount**: `number`

Defined in: [audit/src/structure.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L36)

***

### sourceFileCount

> `readonly` **sourceFileCount**: `number`

Defined in: [audit/src/structure.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/structure.ts#L33)
