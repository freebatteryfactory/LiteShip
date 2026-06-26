[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / resolveAssetUrlByTier

# Function: resolveAssetUrlByTier()

> **resolveAssetUrlByTier**(`entry`, `key`): `string` \| `undefined`

Defined in: [edge/src/manifest.ts:204](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L204)

Resolve the immutable static-asset URL for one tier, when the manifest was
built with boundary asset emission enabled. Missing `assetUrls` means the
host should fall back to inline / Worker-served [CompiledOutputs](../interfaces/CompiledOutputs.md).

## Parameters

### entry

`Pick`\<[`BoundaryManifestEntry`](../interfaces/BoundaryManifestEntry.md), `"outputsByTier"` \| `"assetUrls"`\>

### key

`"none:standard"` \| `"none:minimal"` \| `"none:enhanced"` \| `"none:rich"` \| `"transitions:standard"` \| `"transitions:minimal"` \| `"transitions:enhanced"` \| `"transitions:rich"` \| `"animations:standard"` \| `"animations:minimal"` \| `"animations:enhanced"` \| `"animations:rich"` \| `"physics:standard"` \| `"physics:minimal"` \| `"physics:enhanced"` \| `"physics:rich"` \| `"compute:standard"` \| `"compute:minimal"` \| `"compute:enhanced"` \| `"compute:rich"`

## Returns

`string` \| `undefined`
