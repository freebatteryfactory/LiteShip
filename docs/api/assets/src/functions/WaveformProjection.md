[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / WaveformProjection

# Function: WaveformProjection()

> **WaveformProjection**(`registry`, `audioAssetId`, `opts?`): `CapsuleDef`\<`"cachedProjection"`, `unknown`, readonly `number`[], `unknown`\>

Defined in: [assets/src/analysis/waveform.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/analysis/waveform.ts#L44)

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

`CapsuleDef`\<`"cachedProjection"`, `unknown`, readonly `number`[], `unknown`\>
