[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / DecodedAsset

# Type Alias: DecodedAsset\<K\>

> **DecodedAsset**\<`K`\> = `K` *extends* `"audio"` ? [`DecodedAudio`](../interfaces/DecodedAudio.md) : `K` *extends* `"video"` ? [`DecodedVideo`](../interfaces/DecodedVideo.md) : `K` *extends* `"image"` ? [`DecodedImage`](../interfaces/DecodedImage.md) : `unknown`

Defined in: [assets/src/contract.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L39)

Decoded output for each media [AssetKind](AssetKind.md). Analysis kinds
(beat-markers / onsets / waveform) have no built-in decoder — their
projections come from the dedicated factories (BeatMarkerProjection,
OnsetProjection, WaveformProjection) — so they map to `unknown`.

## Type Parameters

### K

`K` *extends* [`AssetKind`](AssetKind.md)
