[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / StructureCoverageClassification

# Interface: StructureCoverageClassification

Defined in: [audit/src/types.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L70)

Complete coverage receipt for structure-analysis subchecks.

## Properties

### allowlistUnexercised

> `readonly` **allowlistUnexercised**: readonly [`AllowlistUnexercisedEntry`](AllowlistUnexercisedEntry.md)[]

Defined in: [audit/src/types.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L75)

***

### orphan

> `readonly` **orphan**: [`OrphanCoverage`](OrphanCoverage.md) \| [`AuditCoverageNotChecked`](AuditCoverageNotChecked.md)

Defined in: [audit/src/types.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L72)

***

### symbol

> `readonly` **symbol**: [`AuditCoverageNotChecked`](AuditCoverageNotChecked.md) \| [`SymbolOrphanCoverage`](SymbolOrphanCoverage.md)

Defined in: [audit/src/types.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L74)

Symbol-level orphan evidence layered on top of the file-level proxy (CUT A6).

***

### topology

> `readonly` **topology**: readonly [`TopologyCoverageEntry`](TopologyCoverageEntry.md)[]

Defined in: [audit/src/types.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L71)
