[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / builtinDecoderFor

# Function: builtinDecoderFor()

> **builtinDecoderFor**(`kind`): [`AssetDecoder`](../type-aliases/AssetDecoder.md) \| `undefined`

Defined in: [assets/src/contract.ts:125](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L125)

Built-in decoder for a media kind. Analysis kinds (beat-markers /
onsets / waveform) have their own projection factories and no byte
decoder, so they resolve to undefined.

## Parameters

### kind

[`AssetKind`](../type-aliases/AssetKind.md)

## Returns

[`AssetDecoder`](../type-aliases/AssetDecoder.md) \| `undefined`
