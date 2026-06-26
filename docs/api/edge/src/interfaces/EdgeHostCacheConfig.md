[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostCacheConfig

# Interface: EdgeHostCacheConfig

Defined in: [edge/src/host-adapter.ts:107](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L107)

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

### assetUrlsByTier?

> `readonly` `optional` **assetUrlsByTier?**: `Readonly`\<`Partial`\<`Record`\<`"none:standard"` \| `"none:minimal"` \| `"none:enhanced"` \| `"none:rich"` \| `"transitions:standard"` \| `"transitions:minimal"` \| `"transitions:enhanced"` \| `"transitions:rich"` \| `"animations:standard"` \| `"animations:minimal"` \| `"animations:enhanced"` \| `"animations:rich"` \| `"physics:standard"` \| `"physics:minimal"` \| `"physics:enhanced"` \| `"physics:rich"` \| `"compute:standard"` \| `"compute:minimal"` \| `"compute:enhanced"` \| `"compute:rich"`, `string`\>\>\>

Defined in: [edge/src/host-adapter.ts:123](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L123)

Immutable static-asset URL keyed by [TierKey](../type-aliases/TierKey.md) for the single-boundary form.

***

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryConfig`](EdgeHostBoundaryConfig.md)\>\>

Defined in: [edge/src/host-adapter.ts:133](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L133)

Multi-boundary form: outputs sources keyed by boundary name (the
manifest export name). Exclusive with the top-level
`boundaryId`/`precompiled`/`compile` fields.

***

### boundaryId?

> `readonly` `optional` **boundaryId?**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:114](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L114)

Content address of the boundary being compiled (`Boundary.make`'s
`id`). Single-boundary form; exclusive with `boundaries`.

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => [`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

Defined in: [edge/src/host-adapter.ts:125](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L125)

Compile function invoked when neither `precompiled` nor KV has the tier.

#### Parameters

##### context

[`EdgeHostCompileContext`](EdgeHostCompileContext.md)

#### Returns

[`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

***

### kv

> `readonly` **kv**: [`KVNamespace`](KVNamespace.md)

Defined in: [edge/src/host-adapter.ts:109](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L109)

KV namespace backing the boundary cache.

***

### precompiled?

> `readonly` `optional` **precompiled?**: `Readonly`\<`Partial`\<`Record`\<`"none:standard"` \| `"none:minimal"` \| `"none:enhanced"` \| `"none:rich"` \| `"transitions:standard"` \| `"transitions:minimal"` \| `"transitions:enhanced"` \| `"transitions:rich"` \| `"animations:standard"` \| `"animations:minimal"` \| `"animations:enhanced"` \| `"animations:rich"` \| `"physics:standard"` \| `"physics:minimal"` \| `"physics:enhanced"` \| `"physics:rich"` \| `"compute:standard"` \| `"compute:minimal"` \| `"compute:enhanced"` \| `"compute:rich"`, [`CompiledOutputs`](CompiledOutputs.md)\>\>\>

Defined in: [edge/src/host-adapter.ts:121](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L121)

Build-derived outputs keyed by [TierKey](../type-aliases/TierKey.md)
(`"<motionTier>:<designTier>"`) -- a manifest entry inflated via
`resolveOutputsByTier(manifestEntry)`. Checked before KV; a covered
tier never touches the network.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [edge/src/host-adapter.ts:151](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L151)

Optional KV key prefix. Doubles as the per-deploy content version for a
bundled `compile`: set it to a hash of compile's output (e.g.
`layout-${fnv1a(compileLayoutCss())}`) when that output depends on
build-time content outside the boundary's own address.

***

### tags?

> `readonly` `optional` **tags?**: [`EdgeHostCacheTags`](../type-aliases/EdgeHostCacheTags.md)

Defined in: [edge/src/host-adapter.ts:127](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L127)

Tags for the single-boundary form, passed through to the normalized boundary source.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [edge/src/host-adapter.ts:144](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L144)

Cache entry TTL in seconds — an eviction/cost knob, not a freshness
knob. An entry is keyed by boundary content address, tier, name, and
resolved-theme fingerprint, so it never goes stale for a change in any of
those. (A `compile` whose output also depends on build-time inputs the
boundary id does not cover must vary `prefix` per deploy — see `prefix`.)
Deploys that change boundary content mint a new `ContentAddress` and
orphan the old keys, which KV stores (and bills) forever unless a TTL
reclaims them. Omit to cache indefinitely.
