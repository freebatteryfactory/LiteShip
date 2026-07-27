[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / BeatBinding

# Variable: BeatBinding

> `const` **BeatBinding**: `object`

Defined in: [scene/src/beat-binding-capsule.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/beat-binding-capsule.ts#L118)

BeatBinding namespace — pure transforms over beat markers.
Companion type namespace exposes Spawn and Component shapes (ADR-0001).

## Type Declaration

### bind

> `readonly` **bind**: (`beats`) => readonly [`BeatSpawn`](../../../spine/interfaces/BeatSpawn.md)[] = `bindBeats`

Bind a list of beat markers into spawn descriptors.

Pure transform: BeatComponent[] → BeatSpawn[]. Each input beat becomes
one spawn descriptor whose `components` field is admitted through the
canonical `BeatPart` before entering a SceneRuntime world.

Defensive copy of each beat — callers may freeze, mutate, or hand off
the input array; the output is a fresh, owned-by-runtime sequence.

#### Parameters

##### beats

readonly [`BeatComponent`](../../../spine/interfaces/BeatComponent.md)[]

#### Returns

readonly [`BeatSpawn`](../../../spine/interfaces/BeatSpawn.md)[]
