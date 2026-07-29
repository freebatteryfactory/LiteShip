[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [detect/src](../README.md) / headProbeCapTier

# Function: headProbeCapTier()

> **headProbeCapTier**(`caps`): [`CapTier`](../../../liteship/src/evidence/type-aliases/CapTier.md)

Defined in: [detect/src/head-probe.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/head-probe.ts#L55)

Resolve the [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md) for a device — the SINGLE source of truth for
the GPU/cores/memory/reduced-motion → cap-level ladder.

`capTierFromCapabilities` (`tiers.ts`) delegates here for the runtime sweep, and
this exact function body is emitted into the head-inline probe by
[emitDetectUpgradeScript](emitDetectUpgradeScript.md). Edit the ladder here and BOTH update.

Authored as a self-contained pure function over primitives (no imports, no
closures) so its `.toString()` is valid standalone browser script.

## Parameters

### caps

[`HeadProbeCaps`](../interfaces/HeadProbeCaps.md)

## Returns

[`CapTier`](../../../liteship/src/evidence/type-aliases/CapTier.md)
