[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / EdgeHostCacheConfig

# Interface: EdgeHostCacheConfig

Defined in: [\_spine/edge.d.ts:244](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L244)

TTL, tags, and cache implementation used by an edge host.

## Properties

### assetUrlsByTier?

> `readonly` `optional` **assetUrlsByTier?**: `Readonly`\<`Partial`\<`Record`\<`` `${MotionTier}:minimal` `` \| `` `${MotionTier}:standard` `` \| `` `${MotionTier}:enhanced` `` \| `` `${MotionTier}:rich` ``, `string`\>\>\>

Defined in: [\_spine/edge.d.ts:248](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L248)

***

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryConfig`](EdgeHostBoundaryConfig.md)\>\>

Defined in: [\_spine/edge.d.ts:251](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L251)

***

### boundaryId?

> `readonly` `optional` **boundaryId?**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/edge.d.ts:246](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L246)

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => [`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

Defined in: [\_spine/edge.d.ts:249](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L249)

#### Parameters

##### context

[`EdgeHostCompileContext`](EdgeHostCompileContext.md)

#### Returns

[`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

***

### kv

> `readonly` **kv**: [`KVNamespace`](KVNamespace.md)

Defined in: [\_spine/edge.d.ts:245](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L245)

***

### precompiled?

> `readonly` `optional` **precompiled?**: `Readonly`\<`Partial`\<`Record`\<`` `${MotionTier}:minimal` `` \| `` `${MotionTier}:standard` `` \| `` `${MotionTier}:enhanced` `` \| `` `${MotionTier}:rich` ``, [`CompiledOutputs`](CompiledOutputs.md)\>\>\>

Defined in: [\_spine/edge.d.ts:247](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L247)

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [\_spine/edge.d.ts:253](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L253)

***

### tags?

> `readonly` `optional` **tags?**: [`EdgeHostCacheTags`](../type-aliases/EdgeHostCacheTags.md)

Defined in: [\_spine/edge.d.ts:250](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L250)

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [\_spine/edge.d.ts:252](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L252)
