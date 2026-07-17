[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / WavMetadataProjection

# Function: WavMetadataProjection()

> **WavMetadataProjection**(`registry`, `audioAssetId`): `CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, [`WavMetadata`](../interfaces/WavMetadata.md), `unknown`\>

Defined in: [assets/src/analysis/wav-metadata.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/analysis/wav-metadata.ts#L79)

Build a WavMetadataProjection cachedProjection capsule for a named audio
asset, validated against the explicit [AssetRegistry](../variables/AssetRegistry.md) the caller
assembled.

## Parameters

### registry

[`AssetRegistry`](../interfaces/AssetRegistry.md)

### audioAssetId

`string`

## Returns

`CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, [`WavMetadata`](../interfaces/WavMetadata.md), `unknown`\>
