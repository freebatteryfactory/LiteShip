[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / AuditPassResult

# Interface: AuditPassResult

Defined in: [audit/src/index.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L29)

The three audit passes plus their merged counts, run against one profile.

## Properties

### counts

> `readonly` **counts**: [`AuditCounts`](AuditCounts.md)

Defined in: [audit/src/index.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L33)

***

### findings

> `readonly` **findings**: readonly [`AuditFinding`](AuditFinding.md)[]

Defined in: [audit/src/index.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L34)

***

### integrity

> `readonly` **integrity**: [`AuditSectionResult`](AuditSectionResult.md)\<[`IntegritySummary`](IntegritySummary.md)\>

Defined in: [audit/src/index.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L31)

***

### structure

> `readonly` **structure**: [`AuditSectionResult`](AuditSectionResult.md)\<[`StructureSummary`](StructureSummary.md)\>

Defined in: [audit/src/index.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L30)

***

### suppressed

> `readonly` **suppressed**: readonly [`AuditSuppression`](AuditSuppression.md)[]

Defined in: [audit/src/index.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L35)

***

### surface

> `readonly` **surface**: [`AuditSectionResult`](AuditSectionResult.md)\<[`SurfaceSummary`](SurfaceSummary.md)\>

Defined in: [audit/src/index.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L32)
