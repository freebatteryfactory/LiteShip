[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AdaptiveExplanation

# Interface: AdaptiveExplanation

Defined in: [core/src/authoring/adaptive.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L144)

The full explanation of an adaptive at one input value — what state the
boundary resolves to, which thresholds are satisfied, the quantizer's per-
target output for that state, the resolved style layer, and the capability
tier. Pure projection of the members; never recomputes their identity.

## Properties

### boundary

> `readonly` **boundary**: `object`

Defined in: [core/src/authoring/adaptive.ts:149](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L149)

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

Defined in: [core/src/authoring/adaptive.ts:164](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L164)

The adaptive's aggregate content address (`adaptive.id`).

***

### input

> `readonly` **input**: `string`

Defined in: [core/src/authoring/adaptive.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L146)

The boundary's signal input name.

***

### quantized?

> `readonly` `optional` **quantized?**: `Readonly`\<`Record`\<`string`, \{ `state`: `string`; `value`: `unknown`; \}\>\>

Defined in: [core/src/authoring/adaptive.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L158)

Per-target quantizer output for the resolved state, keyed by output target.

***

### style

> `readonly` **style**: `Readonly`\<`Record`\<`string`, \{ `source`: `"base"` \| `"state"`; `value`: `string`; \}\>\>

Defined in: [core/src/authoring/adaptive.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L160)

The resolved style properties at the state, each tagged with its source layer.

***

### tier

> `readonly` **tier**: [`TierChoice`](TierChoice.md)

Defined in: [core/src/authoring/adaptive.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L162)

The capability tier and the projection targets it admits.

***

### value

> `readonly` **value**: `number`

Defined in: [core/src/authoring/adaptive.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L148)

The evaluated value.
