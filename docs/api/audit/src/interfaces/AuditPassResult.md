[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / AuditPassResult

# Interface: AuditPassResult

Defined in: [audit/src/index.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L56)

The three audit passes plus their merged counts, run against one profile.

## Properties

### artifactCoverage

> `readonly` **artifactCoverage**: readonly [`PackageArtifactCoverage`](../type-aliases/PackageArtifactCoverage.md)[]

Defined in: [audit/src/index.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L61)

Exact artifacts each discovered package did or did not contribute to analysis.

***

### counts

> `readonly` **counts**: [`AuditCounts`](AuditCounts.md)

Defined in: [audit/src/index.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L62)

***

### findings

> `readonly` **findings**: readonly [`AuditFinding`](AuditFinding.md)[]

Defined in: [audit/src/index.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L63)

***

### integrity

> `readonly` **integrity**: [`AuditSectionResult`](AuditSectionResult.md)\<[`IntegritySummary`](IntegritySummary.md)\>

Defined in: [audit/src/index.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L58)

***

### structure

> `readonly` **structure**: [`AuditSectionResult`](AuditSectionResult.md)\<[`StructureSummary`](StructureSummary.md)\>

Defined in: [audit/src/index.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L57)

***

### suppressed

> `readonly` **suppressed**: readonly [`AuditSuppression`](AuditSuppression.md)[]

Defined in: [audit/src/index.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L64)

***

### surface

> `readonly` **surface**: [`AuditSectionResult`](AuditSectionResult.md)\<[`SurfaceSummary`](SurfaceSummary.md)\>

Defined in: [audit/src/index.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L59)
