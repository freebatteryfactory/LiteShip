[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [assets/src](../README.md) / BeatMarkerProjection

# Function: BeatMarkerProjection()

> **BeatMarkerProjection**(`registry`, `audioAssetId`): `CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, [`BeatMarkerSet`](../../../spine/interfaces/BeatMarkerSet.md), `unknown`\>

Defined in: [assets/src/analysis/beat-markers.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/analysis/beat-markers.ts#L97)

Build a BeatMarkerProjection cachedProjection capsule for a named audio
asset, validated against the explicit [AssetRegistry](../variables/AssetRegistry.md) the caller
assembled (no module-global lookup).

## Parameters

### registry

[`AssetRegistry`](../interfaces/AssetRegistry.md)

### audioAssetId

`string`

## Returns

`CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, [`BeatMarkerSet`](../../../spine/interfaces/BeatMarkerSet.md), `unknown`\>
