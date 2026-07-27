[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / collectProfileArtifactCoverage

# Function: collectProfileArtifactCoverage()

> **collectProfileArtifactCoverage**(`profile`): readonly [`PackageArtifactCoverage`](../type-aliases/PackageArtifactCoverage.md)[]

Defined in: [audit/src/shared.ts:201](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/shared.ts#L201)

Classify the exact package-relative artifact contract before any audit pass
can call a zero-file package clean.

## Parameters

### profile

[`DevopsProfile`](../interfaces/DevopsProfile.md)

## Returns

readonly [`PackageArtifactCoverage`](../type-aliases/PackageArtifactCoverage.md)[]
