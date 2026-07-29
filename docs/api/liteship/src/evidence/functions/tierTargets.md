[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/evidence](../README.md) / tierTargets

# Function: tierTargets()

> **tierTargets**(`tier`): `ReadonlySet`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md)\>

Defined in: core/dist/evidence/escalation.d.ts:37

Immutable view of a tier's admissible targets. The raw `TIER_TARGET_SETS` table is
module-PRIVATE on purpose: it holds mutable `Set`s, and `@liteship/core` publishes
wildcard subpaths (`./*`), so exporting it would let any consumer reach
`@liteship/core/escalation` and `.clear()`/`.add()` the escalation lattice
process-wide. This returns a fresh copy each call.

## Parameters

### tier

[`CapTier`](../type-aliases/CapTier.md)

## Returns

`ReadonlySet`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md)\>
