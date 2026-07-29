[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [scene/src](../README.md) / bindBeats

# Function: bindBeats()

> **bindBeats**(`beats`): readonly [`BeatSpawn`](../../../spine/interfaces/BeatSpawn.md)[]

Defined in: [scene/src/beat-binding-capsule.ts:110](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/beat-binding-capsule.ts#L110)

Pure transform: BeatComponent[] → BeatSpawn[]. Each input beat becomes
one spawn descriptor whose `components` field is admitted through the
canonical `BeatPart` before entering a SceneRuntime world.

Defensive copy of each beat — callers may freeze, mutate, or hand off
the input array; the output is a fresh, owned-by-runtime sequence.

## Parameters

### beats

readonly [`BeatComponent`](../../../spine/interfaces/BeatComponent.md)[]

## Returns

readonly [`BeatSpawn`](../../../spine/interfaces/BeatSpawn.md)[]
