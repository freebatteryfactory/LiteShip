[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / AuditPassResult

# Interface: AuditPassResult

Defined in: [audit/src/index.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L58)

The three audit passes plus their merged counts, run against one profile.

## Properties

### artifactCoverage

> `readonly` **artifactCoverage**: readonly [`PackageArtifactCoverage`](../type-aliases/PackageArtifactCoverage.md)[]

Defined in: [audit/src/index.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L63)

Exact artifacts each discovered package did or did not contribute to analysis.

***

### counts

> `readonly` **counts**: [`AuditCounts`](AuditCounts.md)

Defined in: [audit/src/index.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L64)

***

### findings

> `readonly` **findings**: readonly [`AuditFinding`](AuditFinding.md)[]

Defined in: [audit/src/index.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L65)

***

### integrity

> `readonly` **integrity**: [`AuditSectionResult`](AuditSectionResult.md)\<[`IntegritySummary`](IntegritySummary.md)\>

Defined in: [audit/src/index.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L60)

***

### structure

> `readonly` **structure**: [`AuditSectionResult`](AuditSectionResult.md)\<[`StructureSummary`](StructureSummary.md)\>

Defined in: [audit/src/index.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L59)

***

### suppressed

> `readonly` **suppressed**: readonly [`AuditSuppression`](AuditSuppression.md)[]

Defined in: [audit/src/index.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L66)

***

### surface

> `readonly` **surface**: [`AuditSectionResult`](AuditSectionResult.md)\<[`SurfaceSummary`](SurfaceSummary.md)\>

Defined in: [audit/src/index.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L61)
