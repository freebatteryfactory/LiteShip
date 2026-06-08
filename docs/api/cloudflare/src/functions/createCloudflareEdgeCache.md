[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / createCloudflareEdgeCache

# Function: createCloudflareEdgeCache()

> **createCloudflareEdgeCache**(`envSource`, `options`): [`KVNamespace`](#)

Defined in: [cloudflare/src/edge-cache.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/edge-cache.ts#L42)

Create a lazy [KVNamespace](#) adapter backed by a Workers env binding.

The env source is invoked on each operation so per-request env timing on
workerd is respected when the caller passes a fresh getter.

## Parameters

### envSource

() => [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md)

### options

[`CloudflareEdgeCacheOptions`](../interfaces/CloudflareEdgeCacheOptions.md)

## Returns

[`KVNamespace`](#)
