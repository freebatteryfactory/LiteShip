[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / createCloudflareEdgeCache

# Function: createCloudflareEdgeCache()

> **createCloudflareEdgeCache**(`envSource`, `options`): [`KVNamespace`](https://github.com/heyoub/LiteShip/blob/main/docs/api/edge/src/interfaces/KVNamespace.md)

Defined in: [cloudflare/src/edge-cache.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L89)

Create a lazy [KVNamespace](https://github.com/heyoub/LiteShip/blob/main/docs/api/edge/src/interfaces/KVNamespace.md) adapter backed by a Workers env binding.

The env source is invoked on each operation so per-request env timing on
workerd is respected when the caller passes a fresh getter.

## Parameters

### envSource

() => [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md)

### options

[`CloudflareEdgeCacheOptions`](../interfaces/CloudflareEdgeCacheOptions.md)

## Returns

[`KVNamespace`](https://github.com/heyoub/LiteShip/blob/main/docs/api/edge/src/interfaces/KVNamespace.md)
