[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [assets/src](../README.md) / WaveformProjection

# Function: WaveformProjection()

> **WaveformProjection**(`registry`, `audioAssetId`, `opts?`): `CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, readonly `number`[], `unknown`\>

Defined in: [assets/src/analysis/waveform.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/analysis/waveform.ts#L53)

Build a WaveformProjection cachedProjection capsule for a named audio asset,
validated against the explicit [AssetRegistry](../variables/AssetRegistry.md) the caller assembled.

## Parameters

### registry

[`AssetRegistry`](../interfaces/AssetRegistry.md)

### audioAssetId

`string`

### opts?

#### bins?

`number`

## Returns

`CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, readonly `number`[], `unknown`\>
