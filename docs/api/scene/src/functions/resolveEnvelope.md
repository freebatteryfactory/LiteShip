[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [scene/src](../README.md) / resolveEnvelope

# Function: resolveEnvelope()

> **resolveEnvelope**(`env`, `ctx`): [`ResolvedEnvelope`](../../../spine/type-aliases/ResolvedEnvelope.md)

Defined in: [scene/src/sugar/envelope.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/sugar/envelope.ts#L65)

Resolve a declared envelope's beat spans to frame counts using the
scene's BPM + fps. Called once by `compileScene` per enveloped track;
the result is the `Envelope` component systems read every tick.

## Parameters

### env

[`TrackEnvelope`](../../../spine/type-aliases/TrackEnvelope.md)

### ctx

#### bpm

`number`

#### fps

`number`

## Returns

[`ResolvedEnvelope`](../../../spine/type-aliases/ResolvedEnvelope.md)
