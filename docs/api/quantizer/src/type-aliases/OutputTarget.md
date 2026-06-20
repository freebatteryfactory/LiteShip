[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / OutputTarget

# Type Alias: OutputTarget

> **OutputTarget** = `"css"` \| `"glsl"` \| `"wgsl"` \| `"aria"` \| `"ai"`

Defined in: [quantizer/src/quantizer.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L56)

Compilation target for quantizer per-state outputs.

`css` emits style declarations, `glsl`/`wgsl` emit shader uniforms,
`aria` emits accessibility attributes, `ai` emits model-facing signals.
MotionTier gates which targets a device is permitted to receive; see
[QuantizerFromOptions.tier](../interfaces/QuantizerFromOptions.md#tier) for the tier → targets table.
