[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / BeatMarkerSet

# Type Alias: BeatMarkerSet

> **BeatMarkerSet** = `_BeatMarkerSet`

Defined in: [assets/src/analysis/beat-markers.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/analysis/beat-markers.ts#L24)

Detected beat markers + overall BPM estimate — the raw asset/sample-space
projection carried by the `asset:beats` capability. Aliased to the canonical
spine contract (CUT A5) so the shape lives in exactly one place; `@czap/scene`
consumes the same family via BeatMarkerSet's sibling `BeatComponent`.
