[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / emitDetectUpgradeScript

# Function: emitDetectUpgradeScript()

> **emitDetectUpgradeScript**(): `string`

Defined in: [detect/src/head-probe.ts:232](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/head-probe.ts#L232)

Build the head-inline GPU-probe IIFE — the script `@czap/astro` injects via
`injectScript('page', ...)`. EVERY classification rule in the returned string
is generated from canonical `@czap/detect`:

  - the renderer→tier classifier is folded from [GPU\_TIER\_PATTERNS](../variables/GPU_TIER_PATTERNS.md);
  - the cap-level ladder is [headProbeCapTier](headProbeCapTier.md), emitted via `.toString()`;
  - the motion ladder is [headProbeMotionTier](headProbeMotionTier.md), emitted via `.toString()`.

Nothing here is hand-typed twice, so the inline probe cannot drift from the
runtime sweep. The `detect-upgrade` drift test additionally runs this exact
emitted script across the full renderer × cores × memory × webgpu matrix and
asserts equality with the canonical pipeline — defence in depth, with
`expected` always computed from canonical, never hardcoded.

## Returns

`string`
