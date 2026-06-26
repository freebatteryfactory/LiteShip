[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / CloudflareEdgeCacheOptions

# Interface: CloudflareEdgeCacheOptions

Defined in: [cloudflare/src/edge-cache.ts:13](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L13)

## Properties

### binding

> `readonly` **binding**: `string`

Defined in: [cloudflare/src/edge-cache.ts:15](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L15)

KV namespace binding name (e.g. `CZAP_BOUNDARY_CACHE`).

***

### cache?

> `readonly` `optional` **cache?**: [`CloudflareCacheApi`](CloudflareCacheApi.md) \| `null`

Defined in: [cloudflare/src/edge-cache.ts:21](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L21)

Cache API implementation. Defaults to `globalThis.caches.default` when present.

***

### cacheTtl?

> `readonly` `optional` **cacheTtl?**: `number`

Defined in: [cloudflare/src/edge-cache.ts:19](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L19)

Cloudflare KV edge-cache TTL, passed through to `kv.get(key, { cacheTtl })`.

***

### ctx?

> `readonly` `optional` **ctx?**: `object`

Defined in: [cloudflare/src/edge-cache.ts:17](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L17)

Workers ExecutionContext; enables background Cache API population on KV hits.

#### waitUntil()

> **waitUntil**(`promise`): `void`

##### Parameters

###### promise

`Promise`\<`unknown`\>

##### Returns

`void`
