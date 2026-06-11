[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostCacheConfig

# Interface: EdgeHostCacheConfig

Defined in: [edge/src/host-adapter.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L59)

Cache configuration for the edge host adapter.

Outputs are resolved in order: `precompiled` (build-derived manifest
entry, no KV round-trip), then the KV cache keyed by
`(boundaryId, tier)`, then `compile` on a miss (result written back to
KV with the configured `ttl`). At least one of `precompiled` or
`compile` must be provided.

## Properties

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:63](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L63)

Content address of the boundary being compiled (`Boundary.make`'s `id`).

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => [`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

Defined in: [edge/src/host-adapter.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L72)

Compile function invoked when neither `precompiled` nor KV has the tier.

#### Parameters

##### context

[`EdgeHostCompileContext`](EdgeHostCompileContext.md)

#### Returns

[`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

***

### kv

> `readonly` **kv**: [`KVNamespace`](KVNamespace.md)

Defined in: [edge/src/host-adapter.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L61)

KV namespace backing the boundary cache.

***

### precompiled?

> `readonly` `optional` **precompiled?**: `Readonly`\<`Partial`\<`Record`\<`"none:standard"` \| `"none:minimal"` \| `"none:enhanced"` \| `"none:rich"` \| `"transitions:standard"` \| `"transitions:minimal"` \| `"transitions:enhanced"` \| `"transitions:rich"` \| `"animations:standard"` \| `"animations:minimal"` \| `"animations:enhanced"` \| `"animations:rich"` \| `"physics:standard"` \| `"physics:minimal"` \| `"physics:enhanced"` \| `"physics:rich"` \| `"compute:standard"` \| `"compute:minimal"` \| `"compute:enhanced"` \| `"compute:rich"`, [`CompiledOutputs`](CompiledOutputs.md)\>\>\>

Defined in: [edge/src/host-adapter.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L70)

Build-derived outputs keyed by [TierKey](../type-aliases/TierKey.md)
(`"<motionTier>:<designTier>"`) -- a manifest entry inflated via
`resolveOutputsByTier(manifestEntry)`. Checked before KV; a covered
tier never touches the network.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [edge/src/host-adapter.ts:82](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L82)

Optional KV key prefix.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [edge/src/host-adapter.ts:80](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L80)

Cache entry TTL in seconds — an eviction/cost knob, not a freshness
knob. Entries are content-addressed and never go stale; deploys that
change boundary content mint a new `ContentAddress` and orphan the old
`boundaryId` x tier keys, which KV stores (and bills) forever unless a
TTL reclaims them. Omit to cache indefinitely.
