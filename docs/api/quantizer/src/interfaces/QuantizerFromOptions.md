[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / QuantizerFromOptions

# Interface: QuantizerFromOptions

Defined in: [quantizer/src/quantizer.ts:143](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L143)

Options accepted by [Q.from](../variables/Q.md#from).

`tier` gates which output targets get produced (see the table on
[QuantizerFromOptions.tier](#tier)).
`spring` enables automatic CSS `--czap-easing` injection on CSS outputs.

## Properties

### spring?

> `readonly` `optional` **spring?**: [`SpringConfig`](SpringConfig.md)

Defined in: [quantizer/src/quantizer.ts:163](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L163)

Spring config that drives CSS easing generation for CSS outputs.

***

### tier?

> `readonly` `optional` **tier?**: `MotionTier`

Defined in: [quantizer/src/quantizer.ts:161](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L161)

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

Outputs defined for a gated-off target are silently dropped;
`.force(...targets)` overrides the gating per target.
