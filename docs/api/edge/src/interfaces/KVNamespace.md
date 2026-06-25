[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / KVNamespace

# Interface: KVNamespace

Defined in: [edge/src/kv-cache.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L30)

Minimal KV namespace interface -- compatible with Cloudflare Workers KV,
Deno KV, or any adapter that implements get/put with string values.

`delete` and `list` are OPTIONAL: they power active invalidation
([BoundaryCache.invalidateByPath](BoundaryCache.md#invalidatebypath) / [BoundaryCache.invalidateByTag](BoundaryCache.md#invalidatebytag)).
A provider that omits them still caches correctly — invalidation then degrades
to the passive TTL-orphaning the content-addressed keyspace already relies on,
with a one-time diagnostic instead of a silent no-op.

## Methods

### delete()?

> `optional` **delete**(`key`): `Promise`\<`void`\>

Defined in: [edge/src/kv-cache.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L34)

Delete a single key. Optional — required for active invalidation.

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`key`): `Promise`\<`string` \| `null`\>

Defined in: [edge/src/kv-cache.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L31)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

***

### list()?

> `optional` **list**(`options`): `Promise`\<\{ `cursor?`: `string`; `keys`: readonly `object`[]; `list_complete`: `boolean`; \}\>

Defined in: [edge/src/kv-cache.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L39)

List keys under a prefix (Cloudflare Workers KV shape, paginated). Optional —
required for [BoundaryCache.invalidateByPath](BoundaryCache.md#invalidatebypath) (prefix-scan purge).

#### Parameters

##### options

###### cursor?

`string`

###### prefix

`string`

#### Returns

`Promise`\<\{ `cursor?`: `string`; `keys`: readonly `object`[]; `list_complete`: `boolean`; \}\>

***

### put()

> **put**(`key`, `value`, `options?`): `Promise`\<`void`\>

Defined in: [edge/src/kv-cache.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L32)

#### Parameters

##### key

`string`

##### value

`string`

##### options?

###### expirationTtl?

`number`

#### Returns

`Promise`\<`void`\>
