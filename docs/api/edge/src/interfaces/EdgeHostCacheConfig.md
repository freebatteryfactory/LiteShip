[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostCacheConfig

# Interface: EdgeHostCacheConfig

Defined in: [edge/src/host-adapter.ts:55](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L55)

Cache configuration for the edge host adapter.

When set, per-boundary compiled outputs are memoized in the supplied KV
namespace keyed by `(boundaryId, tier)`. `compile` is the user-provided
function that produces the outputs on a cache miss; its result is
written back to KV with the configured `ttl`.

## Properties

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L59)

Content address of the boundary being compiled.

***

### compile

> `readonly` **compile**: (`context`) => [`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

Defined in: [edge/src/host-adapter.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L61)

Compile function invoked on cache miss.

#### Parameters

##### context

[`EdgeHostCompileContext`](EdgeHostCompileContext.md)

#### Returns

[`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

***

### kv

> `readonly` **kv**: [`KVNamespace`](KVNamespace.md)

Defined in: [edge/src/host-adapter.ts:57](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L57)

KV namespace backing the boundary cache.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [edge/src/host-adapter.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L71)

Optional KV key prefix.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [edge/src/host-adapter.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L69)

Cache entry TTL in seconds — an eviction/cost knob, not a freshness
knob. Entries are content-addressed and never go stale; deploys that
change boundary content mint a new `ContentAddress` and orphan the old
`boundaryId` x tier keys, which KV stores (and bills) forever unless a
TTL reclaims them. Omit to cache indefinitely.
