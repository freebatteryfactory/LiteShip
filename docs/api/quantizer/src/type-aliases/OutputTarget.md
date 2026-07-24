[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / OutputTarget

# Type Alias: OutputTarget

> **OutputTarget** = [`QualityTierTarget`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/QualityTierTarget.md)

Defined in: [quantizer/src/quantizer.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L70)

Compilation target for quantizer per-state outputs.

`css` emits style declarations, `glsl`/`wgsl` emit shader uniforms,
`aria` emits accessibility attributes, `ai` emits model-facing signals.
MotionTier gates which targets a device is permitted to receive; see
[DefineQuantizerOptions.tier](../interfaces/DefineQuantizerOptions.md#tier) for the tier → targets table.

Aliases `@liteship/core`'s [QualityTierTarget](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/QualityTierTarget.md) — the shared codomain of the
capability-admissibility quality-tier scale both this gate and the core escalation
gate project from — so the target vocabulary itself has a single source too.
