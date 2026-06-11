[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / resolveAssetDecoder

# Function: resolveAssetDecoder()

> **resolveAssetDecoder**(`assetId`): [`AssetDecoder`](../type-aliases/AssetDecoder.md)

Defined in: [assets/src/contract.ts:156](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L156)

Resolve the decode function for an asset id: the registered capsule's
`derive` handler (which carries the asset's own decoder, custom or
built-in) when the asset was registered in this process, else the
audio built-in — host processes that never import the scene's asset
module (e.g. the CLI reading only the compiled manifest) keep today's
audio-decode behavior. The audio fallback matches the only consumers
(beat/onset/waveform are audio projections).

## Parameters

### assetId

`string`

## Returns

[`AssetDecoder`](../type-aliases/AssetDecoder.md)
