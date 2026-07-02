[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / createBoundaryCache

# Function: createBoundaryCache()

> **createBoundaryCache**(`kv`, `options?`): [`BoundaryCache`](../interfaces/BoundaryCache.md)

Defined in: [edge/src/kv-cache.ts:535](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L535)

Create a [BoundaryCache](../interfaces/BoundaryCache.md) backed by the provided KV namespace.

Cache keys encode the boundary content address and the two-axis tier
result so each tier combination gets its own cached compilation output.

## Parameters

### kv

[`KVNamespace`](../interfaces/KVNamespace.md)

A generic KV namespace implementing get/put

### options?

`CacheOptions`

Optional TTL (seconds) and key prefix configuration

## Returns

[`BoundaryCache`](../interfaces/BoundaryCache.md)

A [BoundaryCache](../interfaces/BoundaryCache.md) instance

## Example

```ts
import { KVCache, EdgeTier } from '@czap/edge';
import { Boundary } from '@czap/core';

const kv = { get: async (k: string) => null, put: async (k: string, v: string) => {} };
const cache = KVCache.createBoundaryCache(kv, { ttl: 3600, prefix: 'myapp' });

const myBoundary = Boundary.make({
  input: 'viewport.width',
  at: [[0, 'compact'], [768, 'wide']],
});
const request = new Request('https://example.com', {
  headers: { 'device-memory': '8', 'sec-ch-viewport-width': '1280' },
});
const tierResult = EdgeTier.detectTier(request.headers);

// Store compiled outputs
await cache.putCompiledOutputs(myBoundary.id, tierResult, {
  css: '...',
  propertyRegistrations: '...',
  containerQueries: '...',
});

// Retrieve cached outputs
const cached = await cache.getCompiledOutputs(myBoundary.id, tierResult);
```
