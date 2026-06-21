[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / OutputTarget

# Type Alias: OutputTarget

> **OutputTarget** = `LadderTarget`

Defined in: [quantizer/src/quantizer.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L61)

Compilation target for quantizer per-state outputs.

`css` emits style declarations, `glsl`/`wgsl` emit shader uniforms,
`aria` emits accessibility attributes, `ai` emits model-facing signals.
MotionTier gates which targets a device is permitted to receive; see
[QuantizerFromOptions.tier](../interfaces/QuantizerFromOptions.md#tier) for the tier → targets table.

Aliases `@czap/core`'s LadderTarget — the shared codomain of the
capability-admissibility ladder both this gate and the core escalation gate
project from — so the target vocabulary itself has a single source too.
