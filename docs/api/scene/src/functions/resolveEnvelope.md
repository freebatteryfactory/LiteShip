[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / resolveEnvelope

# Function: resolveEnvelope()

> **resolveEnvelope**(`env`, `ctx`): `ResolvedEnvelope`

Defined in: [scene/src/sugar/envelope.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/sugar/envelope.ts#L64)

Resolve a declared envelope's beat spans to frame counts using the
scene's BPM + fps. Called once by `compileScene` per enveloped track;
the result is the `Envelope` component systems read every tick.

## Parameters

### env

`TrackEnvelope`

### ctx

#### bpm

`number`

#### fps

`number`

## Returns

`ResolvedEnvelope`
