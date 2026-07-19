[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / emitProvisionalDetectScript

# Function: emitProvisionalDetectScript()

> **emitProvisionalDetectScript**(): `string`

Defined in: [detect/src/head-probe.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/head-probe.ts#L146)

Build the head-inline PROVISIONAL detect script — the render-blocking script
`@liteship/astro` injects via `injectScript('head-inline', ...)` BEFORE hydration.

It writes the cheap, non-GPU device attributes (`data-liteship-touch`,
`data-liteship-reduced-motion`, `data-liteship-scheme`, the `--liteship-*` custom props)
and a PROVISIONAL `data-liteship-tier`, then the deferred [emitDetectUpgradeScript](emitDetectUpgradeScript.md)
refines that tier once a real WebGL GPU probe is available.

The provisional tier is NOT a second hand-rolled ladder (the 0.2.3/0.3.0
drift bug-class: this script and the upgrade script both write `data-liteship-tier`,
so a divergent provisional ladder disagrees with canonical by construction).
Instead it calls the SAME canonical [headProbeCapTier](headProbeCapTier.md), emitted verbatim
via `.toString()`, over the inline primitives (`cores`, `memory`,
`prefersReducedMotion`) with a conservative GPU assumption — [GPU\_TIER\_DEFAULT](../variables/GPU_TIER_DEFAULT.md),
the exact fallback the runtime sweep uses when no renderer probe is available.
The provisional therefore equals what canonical computes for a GPU-unavailable
device; the upgrade script later supplies the real GPU tier and re-runs the
same function. One ladder, two callers — they cannot drift.

A drift guard runs this emitted script across the full cores × memory ×
reduced-motion matrix and asserts the written `data-liteship-tier` equals
`headProbeCapTier({ ...inline primitives, gpu: GPU_TIER_DEFAULT, webgpu: false })`
— `expected` computed from the canonical source, never hardcoded.

## Returns

`string`
