[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AdaptiveExplanation

# Interface: AdaptiveExplanation

Defined in: [core/src/authoring/adaptive.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L166)

The full explanation of an adaptive at one input value — what state the
boundary resolves to, which thresholds are satisfied, the quantizer's per-
target output for that state, the resolved style layer, and the capability
tier. Pure projection of the members; never recomputes their identity.

## Properties

### boundary

> `readonly` **boundary**: `object`

Defined in: [core/src/authoring/adaptive.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L171)

#### id

> `readonly` **id**: `ContentAddress`

The boundary's content address (`adaptive.boundary.id`).

#### matched

> `readonly` **matched**: readonly [`ConstraintTrace`](ConstraintTrace.md)[]

Per-threshold trace: which thresholds `value` satisfies and the state each enters.

#### state

> `readonly` **state**: `string`

The resolved state at `value` (via `Boundary.evaluateResult`).

***

### contentAddress

> `readonly` **contentAddress**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:194](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L194)

The adaptive's aggregate content address (`adaptive.id`).

***

### input

> `readonly` **input**: `string`

Defined in: [core/src/authoring/adaptive.ts:168](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L168)

The boundary's signal input name.

***

### quantized?

> `readonly` `optional` **quantized?**: `Readonly`\<`Partial`\<`Record`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md), \{ `state`: `string`; `value`: `unknown`; \}\>\>\>

Defined in: [core/src/authoring/adaptive.ts:180](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L180)

Per-target quantizer output for the resolved state, keyed by output target.

***

### quantizerTier?

> `readonly` `optional` **quantizerTier?**: `object`

Defined in: [core/src/authoring/adaptive.ts:188](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L188)

The quantizer's distinct MotionTier gate, when this Adaptive owns a quantizer.

#### admittedTargets

> `readonly` **admittedTargets**: `ReadonlySet`\<[`QualityTierTarget`](../type-aliases/QualityTierTarget.md)\>

#### force

> `readonly` **force**: readonly [`QualityTierTarget`](../type-aliases/QualityTierTarget.md)[]

#### tier

> `readonly` **tier**: `MotionTier` \| `null`

***

### style

> `readonly` **style**: `Readonly`\<`Record`\<`string`, \{ `source`: `"base"` \| `"state"`; `value`: `string`; \}\>\>

Defined in: [core/src/authoring/adaptive.ts:184](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L184)

The resolved style properties at the state, each tagged with its source layer.

***

### tier

> `readonly` **tier**: [`TierChoice`](TierChoice.md)

Defined in: [core/src/authoring/adaptive.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L186)

The Adaptive capability tier and the projection targets that capability admits.

***

### value

> `readonly` **value**: `number`

Defined in: [core/src/authoring/adaptive.ts:170](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L170)

The evaluated value.
