[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / StructureCoverageClassification

# Interface: StructureCoverageClassification

Defined in: [audit/src/types.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L83)

Complete coverage receipt for structure-analysis subchecks.

## Properties

### allowlistUnexercised

> `readonly` **allowlistUnexercised**: readonly [`AllowlistUnexercisedEntry`](AllowlistUnexercisedEntry.md)[]

Defined in: [audit/src/types.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L88)

***

### orphan

> `readonly` **orphan**: [`OrphanCoverage`](OrphanCoverage.md) \| [`AuditCoverageNotChecked`](AuditCoverageNotChecked.md)

Defined in: [audit/src/types.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L85)

***

### symbol

> `readonly` **symbol**: [`AuditCoverageNotChecked`](AuditCoverageNotChecked.md) \| [`SymbolOrphanCoverage`](SymbolOrphanCoverage.md)

Defined in: [audit/src/types.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L87)

Symbol-level orphan evidence layered on top of the file-level proxy (CUT A6).

***

### topology

> `readonly` **topology**: readonly [`TopologyCoverageEntry`](TopologyCoverageEntry.md)[]

Defined in: [audit/src/types.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L84)
