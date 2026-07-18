[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / envelopeFactor

# Function: envelopeFactor()

> **envelopeFactor**(`env`, `frameIndex`, `range`): `number`

Defined in: [scene/src/sugar/envelope.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/sugar/envelope.ts#L86)

Evaluate a resolved envelope at a frame index within a track's
frame range, returning a multiplicative factor for the system's
written value:

- `linear-in` — ramps 0 → 1 over the first `spanFrames` of the range, then holds 1.
- `linear-out` — holds 1 until the last `spanFrames` of the range, then ramps 1 → 0.
- `pulse` — peaks at `1 + amplitude` on each period boundary and
  decays linearly back to 1 over the period (beat-pulse feel; factors
  above 1 are deliberate overdrive, mirroring the PulseEnvelope contract).

Out-of-range frames are the caller's concern — systems already gate
on FrameRange before applying the factor.

## Parameters

### env

`ResolvedEnvelope`

### frameIndex

`number`

### range

#### from

`number`

#### to

`number`

## Returns

`number`
