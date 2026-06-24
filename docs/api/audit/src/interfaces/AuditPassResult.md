[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / AuditPassResult

# Interface: AuditPassResult

Defined in: [audit/src/index.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L42)

The three audit passes plus their merged counts, run against one profile.

## Properties

### counts

> `readonly` **counts**: [`AuditCounts`](AuditCounts.md)

Defined in: [audit/src/index.ts:46](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L46)

***

### findings

> `readonly` **findings**: readonly [`AuditFinding`](AuditFinding.md)[]

Defined in: [audit/src/index.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L47)

***

### integrity

> `readonly` **integrity**: [`AuditSectionResult`](AuditSectionResult.md)\<[`IntegritySummary`](IntegritySummary.md)\>

Defined in: [audit/src/index.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L44)

***

### structure

> `readonly` **structure**: [`AuditSectionResult`](AuditSectionResult.md)\<[`StructureSummary`](StructureSummary.md)\>

Defined in: [audit/src/index.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L43)

***

### suppressed

> `readonly` **suppressed**: readonly [`AuditSuppression`](AuditSuppression.md)[]

Defined in: [audit/src/index.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L48)

***

### surface

> `readonly` **surface**: [`AuditSectionResult`](AuditSectionResult.md)\<[`SurfaceSummary`](SurfaceSummary.md)\>

Defined in: [audit/src/index.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L45)
