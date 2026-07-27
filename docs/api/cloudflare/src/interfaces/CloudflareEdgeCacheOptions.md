[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / CloudflareEdgeCacheOptions

# Interface: CloudflareEdgeCacheOptions

Defined in: [cloudflare/src/edge-cache.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L19)

Request-scoped options for constructing a Cloudflare edge cache.

## Properties

### binding

> `readonly` **binding**: `string`

Defined in: [cloudflare/src/edge-cache.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L21)

KV namespace binding name (e.g. `LITESHIP_BOUNDARY_CACHE`).

***

### cache?

> `readonly` `optional` **cache?**: [`CloudflareCacheApi`](CloudflareCacheApi.md) \| `null`

Defined in: [cloudflare/src/edge-cache.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L25)

Cache API implementation. Defaults to `globalThis.caches.default` when present.

***

### cacheTtl?

> `readonly` `optional` **cacheTtl?**: `number`

Defined in: [cloudflare/src/edge-cache.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L23)

Cloudflare KV edge-cache TTL, passed through to `kv.get(key, { cacheTtl })`.
