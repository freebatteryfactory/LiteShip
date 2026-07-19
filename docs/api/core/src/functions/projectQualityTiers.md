[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / projectQualityTiers

# Function: projectQualityTiers()

> **projectQualityTiers**\<`Label`\>(`order`): `Record`\<`Label`, `ReadonlySet`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md)\>\>

Defined in: [core/src/quality-tiers.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/quality-tiers.ts#L64)

Project [QUALITY\_TIER\_TARGETS](../variables/QUALITY_TIER_TARGETS.md) onto a vocabulary's ordered tier labels,
producing a `Record<Label, ReadonlySet<QualityTierTarget>>`. The `order` array is
the vocabulary's tiers lowest-to-highest; `order[i]` receives the targets at
quality-tier index `i`. Both `TIER_TARGET_SETS` (core) and `TIER_TARGETS` (quantizer)
are built by this single function, so a congruence guard need only compare
the two projections index-for-index.

## Type Parameters

### Label

`Label` *extends* `string`

## Parameters

### order

readonly `Label`[]

## Returns

`Record`\<`Label`, `ReadonlySet`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md)\>\>

## Throws

if `order.length !== QUALITY_TIER_COUNT` — a vocabulary with the wrong
tier count cannot be a faithful projection of the scale, so the mismatch is loud.
