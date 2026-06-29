[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / DetectReadyDetail

# Type Alias: DetectReadyDetail

> **DetectReadyDetail** = \{ `error?`: `undefined`; `gpuTier`: [`GPUTier`](GPUTier.md); `motionTier`: [`MotionTier`](../../../quantizer/src/type-aliases/MotionTier.md); `tier`: [`CapTier`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md); `webgpu`: `boolean`; \} \| \{ `error`: `true`; \}

Defined in: [detect/src/detect-ready.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect-ready.ts#L31)

The `czap:detect-ready` payload. On the probe's SUCCESS path it carries the
resolved cap/motion/GPU tiers; on its ERROR path it carries `{ error: true }`
(the provisional tier stands). Either way the event fires exactly once.
