[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / DefineQuantizerOptions

# Interface: DefineQuantizerOptions\<B, O\>

Defined in: [quantizer/src/quantizer.ts:155](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L155)

Options accepted by [defineQuantizer](../functions/defineQuantizer.md) — the authored intent of a quantizer.

`outputs` is the required per-target output tables (the sole positional argument
of the retired `.outputs(...)` chain step). `tier` gates which output targets get
produced (see the table on [DefineQuantizerOptions.tier](#tier)). `spring` enables
automatic CSS `--liteship-easing` injection on CSS outputs. `force` is the
per-target escape hatch (the retired `.force(...)` chain step), overriding tier
gating for the listed targets. Every field is part of the config's
content-addressed identity.

## Type Parameters

### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

## Properties

### force?

> `readonly` `optional` **force?**: readonly [`QualityTierTarget`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/QualityTierTarget.md)[]

Defined in: [quantizer/src/quantizer.ts:179](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L179)

Targets to force-enable regardless of the current tier's gating set.

***

### outputs

> `readonly` **outputs**: `O`

Defined in: [quantizer/src/quantizer.ts:157](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L157)

Per-target output tables keyed by boundary state.

***

### spring?

> `readonly` `optional` **spring?**: [`SpringConfig`](SpringConfig.md)

Defined in: [quantizer/src/quantizer.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L177)

Spring config that drives CSS easing generation for CSS outputs.

***

### tier?

> `readonly` `optional` **tier?**: `MotionTier`

Defined in: [quantizer/src/quantizer.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L175)

MotionTier for output gating; omit to allow all targets.

Each tier permits a fixed set of output targets (higher tiers include
lower-tier targets):

| tier          | allowed targets                     |
| ------------- | ----------------------------------- |
| `none`        | `aria`                              |
| `transitions` | `css`, `aria`                       |
| `animations`  | `css`, `aria`                       |
| `physics`     | `css`, `glsl`, `aria`               |
| `compute`     | `css`, `glsl`, `wgsl`, `aria`, `ai` |

Outputs defined for a gated-off target are silently dropped; list the target
in `force` to override the gating per target.
