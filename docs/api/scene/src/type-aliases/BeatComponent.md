[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / BeatComponent

# Type Alias: BeatComponent

> **BeatComponent** = `_BeatComponent`

Defined in: [scene/src/capsules/beat-binding.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/capsules/beat-binding.ts#L30)

Component shape for beat entities — what SyncSystem queries via
`world.query('Beat')`. Aliased to the canonical spine contract (CUT A5):
the scene/world timeline-space stage of the beat family. The raw
asset/sample-space sibling is `@czap/assets`' `BeatMarkerSet`; the official
bridge between them is `resolveBeatProjectionToSceneBeats` (./beat-projection).
