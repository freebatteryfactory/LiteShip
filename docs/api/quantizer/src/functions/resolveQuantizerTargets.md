[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / resolveQuantizerTargets

# Function: resolveQuantizerTargets()

> **resolveQuantizerTargets**(`tier`, `force?`): `ReadonlySet`\<[`QualityTierTarget`](../../../liteship/src/evidence/type-aliases/QualityTierTarget.md)\>

Defined in: [quantizer/src/quantizer.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L104)

Resolve the exact target set a live quantizer admits for a motion tier plus
explicit force overrides. This is the single target-gating owner used by
both runtime dispatch and higher-level explanations.

## Parameters

### tier

[`MotionTier`](../../../spine/type-aliases/MotionTier.md) \| `undefined`

### force?

readonly [`QualityTierTarget`](../../../liteship/src/evidence/type-aliases/QualityTierTarget.md)[] = `[]`

## Returns

`ReadonlySet`\<[`QualityTierTarget`](../../../liteship/src/evidence/type-aliases/QualityTierTarget.md)\>
