[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / tierTargets

# Function: tierTargets()

> **tierTargets**(`tier`): `ReadonlySet`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md)\>

Defined in: [core/src/evidence/escalation.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/escalation.ts#L57)

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
