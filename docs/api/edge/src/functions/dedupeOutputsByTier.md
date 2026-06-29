[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / dedupeOutputsByTier

# Function: dedupeOutputsByTier()

> **dedupeOutputsByTier**(`outputsByTier`): `Pick`\<[`BoundaryManifestEntry`](../interfaces/BoundaryManifestEntry.md), `"outputs"` \| `"outputsByTier"`\>

Defined in: [edge/src/manifest.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L130)

Deduplicate a fully-materialized per-tier outputs map into the pooled
[BoundaryManifestEntry](../interfaces/BoundaryManifestEntry.md) shape (`outputs` + index refs).

Identity is the full `css` / `propertyRegistrations` / `containerQueries` /
`aria` / `glsl` / `wgsl` tuple, and cells are visited in
[enumerateTierKeys](enumerateTierKeys.md) order so the pool order -- and the serialized
manifest bytes -- are stable regardless of the producer's insertion order.
Each non-CSS cast is part of identity so two boundaries that differ only in
their `@glsl` / `@wgsl` cast get distinct content addresses (and distinct
pool entries).

## Parameters

### outputsByTier

`Readonly`\<`Partial`\<`Record`\<[`TierKey`](../type-aliases/TierKey.md), [`CompiledOutputs`](../interfaces/CompiledOutputs.md)\>\>\>

## Returns

`Pick`\<[`BoundaryManifestEntry`](../interfaces/BoundaryManifestEntry.md), `"outputs"` \| `"outputsByTier"`\>
