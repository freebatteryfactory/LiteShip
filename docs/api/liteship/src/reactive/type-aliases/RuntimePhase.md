[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / RuntimePhase

# Type Alias: RuntimePhase

> **RuntimePhase** = `"compute-discrete"` \| `"compute-blend"` \| `"emit-css"` \| `"emit-glsl"` \| `"emit-wgsl"` \| `"emit-aria"`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:21

Named stages of the runtime frame pass, in canonical topological order:
discrete quantization first, then blend weights, then target emitters.
