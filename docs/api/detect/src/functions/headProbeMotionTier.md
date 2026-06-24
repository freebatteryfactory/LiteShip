[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / headProbeMotionTier

# Function: headProbeMotionTier()

> **headProbeMotionTier**(`caps`): `MotionTier`

Defined in: [detect/src/head-probe.ts:80](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/head-probe.ts#L80)

Resolve the [MotionTier](../../../quantizer/src/type-aliases/MotionTier.md) for a device — the SINGLE source of truth for
the GPU/cores/reduced-motion → motion ladder.

`motionTierFromCapabilities` (`tiers.ts`) delegates here for the runtime
sweep, and this exact body is emitted into the head probe by
[emitDetectUpgradeScript](emitDetectUpgradeScript.md). Edit the ladder here and BOTH update.

Authored as a self-contained pure function over primitives so its
`.toString()` is valid standalone browser script.

## Parameters

### caps

[`HeadProbeCaps`](../interfaces/HeadProbeCaps.md)

## Returns

`MotionTier`
