[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / BeatMarkerProjection

# Function: BeatMarkerProjection()

> **BeatMarkerProjection**(`registry`, `audioAssetId`): `CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, `BeatMarkerSet`, `unknown`\>

Defined in: [assets/src/analysis/beat-markers.ts:87](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/analysis/beat-markers.ts#L87)

Build a BeatMarkerProjection cachedProjection capsule for a named audio
asset, validated against the explicit [AssetRegistry](../variables/AssetRegistry.md) the caller
assembled (no module-global lookup).

## Parameters

### registry

[`AssetRegistry`](../interfaces/AssetRegistry.md)

### audioAssetId

`string`

## Returns

`CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, `BeatMarkerSet`, `unknown`\>
