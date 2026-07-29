[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / AdaptiveLowering

# Interface: AdaptiveLowering

Defined in: [core/src/authoring/adaptive.ts:260](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L260)

The supplied `@liteship/compiler` Adaptive state-marker CSS projection.

## Properties

### compileAdaptiveCss

> `readonly` **compileAdaptiveCss**: (`style`) => `string`

Defined in: [core/src/authoring/adaptive.ts:269](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L269)

The real `@liteship/compiler` state-marker projection.

#### Parameters

##### style

[`Style`](../type-aliases/Style.md)

#### Returns

`string`

***

### defineQuantizer

> `readonly` **defineQuantizer**: `AdaptiveQuantizerLowering`

Defined in: [core/src/authoring/adaptive.ts:262](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L262)

The real memoized `@liteship/quantizer` constructor.

***

### resolveQuantizerTargets

> `readonly` **resolveQuantizerTargets**: (`tier`, `force`) => `ReadonlySet`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md)\>

Defined in: [core/src/authoring/adaptive.ts:264](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L264)

The quantizer owner's exact tier + force target resolver used by live dispatch.

#### Parameters

##### tier

[`MotionTier`](../../../spine/type-aliases/MotionTier.md) \| `undefined`

##### force

readonly [`QualityTierTarget`](../type-aliases/QualityTierTarget.md)[] \| `undefined`

#### Returns

`ReadonlySet`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md)\>
