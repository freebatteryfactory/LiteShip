[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / MotionTier

# Type Alias: MotionTier

> **MotionTier** = `"none"` \| `"transitions"` \| `"animations"` \| `"physics"` \| `"compute"`

Defined in: [\_spine/core.d.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L31)

The runtime motion tier — derived from device capability + user preference
(notably `prefers-reduced-motion`) and used to gate animation / output
targets. Canonical declaration; `_spine/detect.d.ts` and `_spine/quantizer.d.ts`
re-anchor from here, and `packages/core/src/evidence/ui-quality.ts` re-exports it.

Order is from lowest capability to highest. `none` is forced by
`prefers-reduced-motion: reduce` regardless of GPU tier; `compute` unlocks
every output target including the Rust/WASM kernels.
