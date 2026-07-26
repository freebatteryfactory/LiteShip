[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / StructureCoverageClassification

# Interface: StructureCoverageClassification

Defined in: [audit/src/types.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L77)

## Properties

### allowlistUnexercised

> `readonly` **allowlistUnexercised**: readonly [`AllowlistUnexercisedEntry`](AllowlistUnexercisedEntry.md)[]

Defined in: [audit/src/types.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L82)

***

### orphan

> `readonly` **orphan**: [`OrphanCoverage`](OrphanCoverage.md) \| [`AuditCoverageNotChecked`](AuditCoverageNotChecked.md)

Defined in: [audit/src/types.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L79)

***

### symbol

> `readonly` **symbol**: [`AuditCoverageNotChecked`](AuditCoverageNotChecked.md) \| [`SymbolOrphanCoverage`](SymbolOrphanCoverage.md)

Defined in: [audit/src/types.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L81)

Symbol-level orphan evidence layered on top of the file-level proxy (CUT A6).

***

### topology

> `readonly` **topology**: readonly [`TopologyCoverageEntry`](TopologyCoverageEntry.md)[]

Defined in: [audit/src/types.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L78)
