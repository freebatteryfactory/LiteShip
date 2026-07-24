[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostBoundaryConfig

# Interface: EdgeHostBoundaryConfig

Defined in: [edge/src/host-adapter.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L69)

Outputs source for one boundary -- the per-boundary slice of
[EdgeHostCacheConfig](EdgeHostCacheConfig.md). Resolution order per boundary is
`precompiled`, then KV keyed by `(boundaryId, tier)`, then `compile`
(written back to KV). At least one of `precompiled` or `compile` is
required.

## Properties

### assetUrlsByTier?

> `readonly` `optional` **assetUrlsByTier?**: `Readonly`\<`Partial`\<`Record`\<`"none:standard"` \| `"none:minimal"` \| `"none:enhanced"` \| `"none:rich"` \| `"transitions:standard"` \| `"transitions:minimal"` \| `"transitions:enhanced"` \| `"transitions:rich"` \| `"animations:standard"` \| `"animations:minimal"` \| `"animations:enhanced"` \| `"animations:rich"` \| `"physics:standard"` \| `"physics:minimal"` \| `"physics:enhanced"` \| `"physics:rich"` \| `"compute:standard"` \| `"compute:minimal"` \| `"compute:enhanced"` \| `"compute:rich"`, `string`\>\>\>

Defined in: [edge/src/host-adapter.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L82)

Immutable static-asset URL keyed by [TierKey](../type-aliases/TierKey.md), derived from a
manifest entry's optional `assetUrls`. Metadata only: it never changes
the cache key or lookup order.

***

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L71)

Content address of the boundary being compiled (`defineBoundary`'s `id`).

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => [`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

Defined in: [edge/src/host-adapter.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L84)

Compile function invoked when neither `precompiled` nor KV has the tier.

#### Parameters

##### context

[`EdgeHostCompileContext`](EdgeHostCompileContext.md)

#### Returns

[`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

***

### precompiled?

> `readonly` `optional` **precompiled?**: `Readonly`\<`Partial`\<`Record`\<`"none:standard"` \| `"none:minimal"` \| `"none:enhanced"` \| `"none:rich"` \| `"transitions:standard"` \| `"transitions:minimal"` \| `"transitions:enhanced"` \| `"transitions:rich"` \| `"animations:standard"` \| `"animations:minimal"` \| `"animations:enhanced"` \| `"animations:rich"` \| `"physics:standard"` \| `"physics:minimal"` \| `"physics:enhanced"` \| `"physics:rich"` \| `"compute:standard"` \| `"compute:minimal"` \| `"compute:enhanced"` \| `"compute:rich"`, [`CompiledOutputs`](CompiledOutputs.md)\>\>\>

Defined in: [edge/src/host-adapter.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L76)

Build-derived outputs keyed by [TierKey](../type-aliases/TierKey.md) -- the `outputsByTier`
field of a boundary manifest entry. Checked before KV.

***

### tags?

> `readonly` `optional` **tags?**: [`EdgeHostCacheTags`](../type-aliases/EdgeHostCacheTags.md)

Defined in: [edge/src/host-adapter.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L90)

Tags written into the boundary cache index when `compile` fills a KV miss.
Use the same values as Astro `routeRules.tags` when `cache.invalidate({ tags })`
should purge the corresponding LiteShip boundary CSS variants.
