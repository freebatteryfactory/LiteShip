[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / AuditPassResult

# Interface: AuditPassResult

Defined in: [audit/src/index.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L53)

The three audit passes plus their merged counts, run against one profile.

## Properties

### artifactCoverage

> `readonly` **artifactCoverage**: readonly [`PackageArtifactCoverage`](../type-aliases/PackageArtifactCoverage.md)[]

Defined in: [audit/src/index.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L58)

Exact artifacts each discovered package did or did not contribute to analysis.

***

### counts

> `readonly` **counts**: [`AuditCounts`](AuditCounts.md)

Defined in: [audit/src/index.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L59)

***

### findings

> `readonly` **findings**: readonly [`AuditFinding`](AuditFinding.md)[]

Defined in: [audit/src/index.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L60)

***

### integrity

> `readonly` **integrity**: [`AuditSectionResult`](AuditSectionResult.md)\<[`IntegritySummary`](IntegritySummary.md)\>

Defined in: [audit/src/index.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L55)

***

### structure

> `readonly` **structure**: [`AuditSectionResult`](AuditSectionResult.md)\<[`StructureSummary`](StructureSummary.md)\>

Defined in: [audit/src/index.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L54)

***

### suppressed

> `readonly` **suppressed**: readonly [`AuditSuppression`](AuditSuppression.md)[]

Defined in: [audit/src/index.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L61)

***

### surface

> `readonly` **surface**: [`AuditSectionResult`](AuditSectionResult.md)\<[`SurfaceSummary`](SurfaceSummary.md)\>

Defined in: [audit/src/index.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L56)
