[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AdaptiveLowering

# Interface: AdaptiveLowering

Defined in: [core/src/authoring/adaptive.ts:258](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L258)

The supplied `@liteship/compiler` style→layers compiler (`StyleCSSCompiler.compile(style).layers`).

## Properties

### compileStyleLayers

> `readonly` **compileStyleLayers**: (`style`) => `string`

Defined in: [core/src/authoring/adaptive.ts:267](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L267)

The real `@liteship/compiler` style-layer projection.

#### Parameters

##### style

[`Style`](../type-aliases/Style.md)

#### Returns

`string`

***

### defineQuantizer

> `readonly` **defineQuantizer**: `AdaptiveQuantizerLowering`

Defined in: [core/src/authoring/adaptive.ts:260](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L260)

The real memoized `@liteship/quantizer` constructor.

***

### resolveQuantizerTargets

> `readonly` **resolveQuantizerTargets**: (`tier`, `force`) => `ReadonlySet`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md)\>

Defined in: [core/src/authoring/adaptive.ts:262](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L262)

The quantizer owner's exact tier + force target resolver used by live dispatch.

#### Parameters

##### tier

`MotionTier` \| `undefined`

##### force

readonly [`QualityTierTarget`](../type-aliases/QualityTierTarget.md)[] \| `undefined`

#### Returns

`ReadonlySet`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md)\>
