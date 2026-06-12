[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostCacheConfig

# Interface: EdgeHostCacheConfig

Defined in: [edge/src/host-adapter.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L89)

Cache configuration for the edge host adapter.

Two forms, mutually exclusive. Single boundary: `boundaryId` plus
`precompiled`/`compile` at the top level. Multiple boundaries (real
pages render several): `boundaries`, a name-keyed record of
[EdgeHostBoundaryConfig](EdgeHostBoundaryConfig.md). Either way, outputs per boundary are
resolved in order: `precompiled` (build-derived manifest entry, no KV
round-trip), then the KV cache keyed by `(boundaryId, tier)` -- the key
carries the boundary's content address, so boundaries can never read
each other's cached CSS -- then `compile` on a miss (result written
back to KV with the configured `ttl`).

## Properties

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryConfig`](EdgeHostBoundaryConfig.md)\>\>

Defined in: [edge/src/host-adapter.ts:111](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L111)

Multi-boundary form: outputs sources keyed by boundary name (the
manifest export name). Exclusive with the top-level
`boundaryId`/`precompiled`/`compile` fields.

***

### boundaryId?

> `readonly` `optional` **boundaryId?**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:96](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L96)

Content address of the boundary being compiled (`Boundary.make`'s
`id`). Single-boundary form; exclusive with `boundaries`.

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => [`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

Defined in: [edge/src/host-adapter.ts:105](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L105)

Compile function invoked when neither `precompiled` nor KV has the tier.

#### Parameters

##### context

[`EdgeHostCompileContext`](EdgeHostCompileContext.md)

#### Returns

[`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

***

### kv

> `readonly` **kv**: [`KVNamespace`](KVNamespace.md)

Defined in: [edge/src/host-adapter.ts:91](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L91)

KV namespace backing the boundary cache.

***

### precompiled?

> `readonly` `optional` **precompiled?**: `Readonly`\<`Partial`\<`Record`\<`"none:standard"` \| `"none:minimal"` \| `"none:enhanced"` \| `"none:rich"` \| `"transitions:standard"` \| `"transitions:minimal"` \| `"transitions:enhanced"` \| `"transitions:rich"` \| `"animations:standard"` \| `"animations:minimal"` \| `"animations:enhanced"` \| `"animations:rich"` \| `"physics:standard"` \| `"physics:minimal"` \| `"physics:enhanced"` \| `"physics:rich"` \| `"compute:standard"` \| `"compute:minimal"` \| `"compute:enhanced"` \| `"compute:rich"`, [`CompiledOutputs`](CompiledOutputs.md)\>\>\>

Defined in: [edge/src/host-adapter.ts:103](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L103)

Build-derived outputs keyed by [TierKey](../type-aliases/TierKey.md)
(`"<motionTier>:<designTier>"`) -- a manifest entry inflated via
`resolveOutputsByTier(manifestEntry)`. Checked before KV; a covered
tier never touches the network.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [edge/src/host-adapter.ts:121](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L121)

Optional KV key prefix.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [edge/src/host-adapter.ts:119](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L119)

Cache entry TTL in seconds — an eviction/cost knob, not a freshness
knob. Entries are content-addressed and never go stale; deploys that
change boundary content mint a new `ContentAddress` and orphan the old
`boundaryId` x tier keys, which KV stores (and bills) forever unless a
TTL reclaims them. Omit to cache indefinitely.
