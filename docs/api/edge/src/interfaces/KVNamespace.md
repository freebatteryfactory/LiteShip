[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / KVNamespace

# Interface: KVNamespace

Defined in: [edge/src/kv-cache.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L31)

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

Defined in: [edge/src/kv-cache.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L35)

Delete a single key. Optional — required for active invalidation.

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`key`, `options?`): `Promise`\<`string` \| `null`\>

Defined in: [edge/src/kv-cache.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L32)

#### Parameters

##### key

`string`

##### options?

###### cacheTtl?

`number`

#### Returns

`Promise`\<`string` \| `null`\>

***

### list()?

> `optional` **list**(`options`): `Promise`\<\{ `cursor?`: `string`; `keys`: readonly `object`[]; `list_complete`: `boolean`; \}\>

Defined in: [edge/src/kv-cache.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L40)

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

Defined in: [edge/src/kv-cache.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L33)

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
