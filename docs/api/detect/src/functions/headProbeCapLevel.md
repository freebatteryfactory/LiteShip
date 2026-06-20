[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / headProbeCapLevel

# Function: headProbeCapLevel()

> **headProbeCapLevel**(`caps`): [`CapLevel`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md)

Defined in: detect/src/head-probe.ts:53

Resolve the [CapLevel](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md) for a device — the SINGLE source of truth for
the GPU/cores/memory/reduced-motion → cap-level ladder.

`tierFromCapabilities` (`tiers.ts`) delegates here for the runtime sweep, and
this exact function body is emitted into the head-inline probe by
[emitDetectUpgradeScript](emitDetectUpgradeScript.md). Edit the ladder here and BOTH update.

Authored as a self-contained pure function over primitives (no imports, no
closures) so its `.toString()` is valid standalone browser script.

## Parameters

### caps

[`HeadProbeCaps`](../interfaces/HeadProbeCaps.md)

## Returns

[`CapLevel`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md)
