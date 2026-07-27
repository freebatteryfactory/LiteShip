[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / BeatComponent

# Type Alias: BeatComponent

> **BeatComponent** = [`BeatComponent`](../../../spine/interfaces/BeatComponent.md)

Defined in: [scene/src/beat-binding-capsule.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/beat-binding-capsule.ts#L30)

Component shape for beat entities — what SyncSystem reads through the
canonical `BeatPart`. Aliased to the canonical spine contract (CUT A5):
the scene/world timeline-space stage of the beat family. The raw
asset/sample-space sibling is `@liteship/assets`' `BeatMarkerSet`; the official
bridge between them is `resolveBeatProjectionToSceneBeats` (./beat-projection).
