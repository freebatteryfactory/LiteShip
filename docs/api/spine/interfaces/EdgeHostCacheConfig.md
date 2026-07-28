[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / EdgeHostCacheConfig

# Interface: EdgeHostCacheConfig

Defined in: [\_spine/edge.d.ts:264](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L264)

TTL, tags, and cache implementation used by an edge host.

## Properties

### assetUrlsByTier?

> `readonly` `optional` **assetUrlsByTier?**: `Readonly`\<`Partial`\<`Record`\<`"none:rich"` \| `"none:minimal"` \| `"none:standard"` \| `"none:enhanced"` \| `"transitions:rich"` \| `"transitions:minimal"` \| `"transitions:standard"` \| `"transitions:enhanced"` \| `"animations:rich"` \| `"animations:minimal"` \| `"animations:standard"` \| `"animations:enhanced"` \| `"physics:rich"` \| `"physics:minimal"` \| `"physics:standard"` \| `"physics:enhanced"` \| `"compute:rich"` \| `"compute:minimal"` \| `"compute:standard"` \| `"compute:enhanced"`, `string`\>\>\>

Defined in: [\_spine/edge.d.ts:268](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L268)

***

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryConfig`](EdgeHostBoundaryConfig.md)\>\>

Defined in: [\_spine/edge.d.ts:271](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L271)

***

### boundaryId?

> `readonly` `optional` **boundaryId?**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/edge.d.ts:266](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L266)

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => [`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

Defined in: [\_spine/edge.d.ts:269](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L269)

#### Parameters

##### context

[`EdgeHostCompileContext`](EdgeHostCompileContext.md)

#### Returns

[`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

***

### kv

> `readonly` **kv**: [`KVNamespace`](KVNamespace.md)

Defined in: [\_spine/edge.d.ts:265](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L265)

***

### precompiled?

> `readonly` `optional` **precompiled?**: `Readonly`\<`Partial`\<`Record`\<`"none:rich"` \| `"none:minimal"` \| `"none:standard"` \| `"none:enhanced"` \| `"transitions:rich"` \| `"transitions:minimal"` \| `"transitions:standard"` \| `"transitions:enhanced"` \| `"animations:rich"` \| `"animations:minimal"` \| `"animations:standard"` \| `"animations:enhanced"` \| `"physics:rich"` \| `"physics:minimal"` \| `"physics:standard"` \| `"physics:enhanced"` \| `"compute:rich"` \| `"compute:minimal"` \| `"compute:standard"` \| `"compute:enhanced"`, [`CompiledOutputs`](CompiledOutputs.md)\>\>\>

Defined in: [\_spine/edge.d.ts:267](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L267)

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [\_spine/edge.d.ts:273](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L273)

***

### tags?

> `readonly` `optional` **tags?**: [`EdgeHostCacheTags`](../type-aliases/EdgeHostCacheTags.md)

Defined in: [\_spine/edge.d.ts:270](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L270)

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [\_spine/edge.d.ts:272](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L272)
