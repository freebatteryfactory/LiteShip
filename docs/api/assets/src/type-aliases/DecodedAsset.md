[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / DecodedAsset

# Type Alias: DecodedAsset\<K\>

> **DecodedAsset**\<`K`\> = `K` *extends* `"audio"` ? [`DecodedAudio`](../interfaces/DecodedAudio.md) : `K` *extends* `"video"` ? [`DecodedVideo`](../interfaces/DecodedVideo.md) : `K` *extends* `"image"` ? [`DecodedImage`](../interfaces/DecodedImage.md) : `never`

Defined in: [assets/src/contract.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L38)

Decoded output for each source-media [AssetKind](AssetKind.md). Beat markers,
onsets, and waveforms are derived by their dedicated projection factories;
they are not byte-source kinds and therefore cannot widen this type to
`unknown`.

## Type Parameters

### K

`K` *extends* [`AssetKind`](AssetKind.md)
