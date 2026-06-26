[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / resolveOutputsByTier

# Function: resolveOutputsByTier()

> **resolveOutputsByTier**(`entry`): `Readonly`\<`Partial`\<`Record`\<[`TierKey`](../type-aliases/TierKey.md), [`CompiledOutputs`](../interfaces/CompiledOutputs.md)\>\>\>

Defined in: [edge/src/manifest.ts:164](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L164)

Inflate a pooled [BoundaryManifestEntry](../interfaces/BoundaryManifestEntry.md) back into the per-tier
[CompiledOutputs](../interfaces/CompiledOutputs.md) map that `EdgeHostCacheConfig.precompiled`
consumes. Resolved cells share pool object references, so per-tier
lookups return byte-identical strings to what the build compiled.

## Parameters

### entry

`Pick`\<[`BoundaryManifestEntry`](../interfaces/BoundaryManifestEntry.md), `"outputs"` \| `"outputsByTier"`\>

## Returns

`Readonly`\<`Partial`\<`Record`\<[`TierKey`](../type-aliases/TierKey.md), [`CompiledOutputs`](../interfaces/CompiledOutputs.md)\>\>\>
