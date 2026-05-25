[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / bindBeats

# Function: bindBeats()

> **bindBeats**(`beats`): readonly `BeatSpawn`[]

Defined in: [scene/src/capsules/beat-binding.ts:110](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/capsules/beat-binding.ts#L110)

Pure transform: BeatComponent[] → BeatSpawn[]. Each input beat becomes
one spawn descriptor whose `components` field is suitable for direct
use as the `Beat` component bag in `world.spawn({ Beat: ... })`.

Defensive copy of each beat — callers may freeze, mutate, or hand off
the input array; the output is a fresh, owned-by-runtime sequence.

## Parameters

### beats

readonly `BeatComponent`[]

## Returns

readonly `BeatSpawn`[]
