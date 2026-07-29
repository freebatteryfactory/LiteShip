[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [cloudflare/src](../README.md) / createCloudflareEdgeCache

# Function: createCloudflareEdgeCache()

> **createCloudflareEdgeCache**(`envSource`, `options`, `requestContext?`): [`KVNamespace`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/edge/src/interfaces/KVNamespace.md)

Defined in: [cloudflare/src/edge-cache.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L116)

Create a lazy [KVNamespace](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/edge/src/interfaces/KVNamespace.md) adapter backed by a Workers env binding.

The env source is invoked on each operation so per-request env timing on
workerd is respected when the caller passes a fresh getter.

## Parameters

### envSource

() => [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md)

### options

[`CloudflareEdgeCacheOptions`](../interfaces/CloudflareEdgeCacheOptions.md)

### requestContext?

[`CloudflareExecutionContext`](../interfaces/CloudflareExecutionContext.md)

## Returns

[`KVNamespace`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/edge/src/interfaces/KVNamespace.md)
