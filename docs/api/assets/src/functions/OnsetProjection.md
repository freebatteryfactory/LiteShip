[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [assets/src](../README.md) / OnsetProjection

# Function: OnsetProjection()

> **OnsetProjection**(`registry`, `audioAssetId`): `CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, readonly `number`[], `unknown`\>

Defined in: [assets/src/analysis/onsets.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/analysis/onsets.ts#L63)

Build an OnsetProjection cachedProjection capsule for a named audio asset,
validated against the explicit [AssetRegistry](../variables/AssetRegistry.md) the caller assembled.

## Parameters

### registry

[`AssetRegistry`](../interfaces/AssetRegistry.md)

### audioAssetId

`string`

## Returns

`CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, readonly `number`[], `unknown`\>
