[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / RuntimePhase

# Type Alias: RuntimePhase

> **RuntimePhase** = `"compute-discrete"` \| `"compute-blend"` \| `"emit-css"` \| `"emit-glsl"` \| `"emit-wgsl"` \| `"emit-aria"`

Defined in: [core/src/reactive/runtime-coordinator.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L24)

Named stages of the runtime frame pass, in canonical topological order:
discrete quantization first, then blend weights, then target emitters.
