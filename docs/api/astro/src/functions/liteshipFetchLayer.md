[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / liteshipFetchLayer

# Function: liteshipFetchLayer()

> **liteshipFetchLayer**(`config?`): [`LiteshipFetchLayer`](../type-aliases/LiteshipFetchLayer.md)

Defined in: [astro/src/fetch-layer.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L162)

Create the liteship fetch layer.

## Parameters

### config?

[`LiteshipFetchLayerConfig`](../interfaces/LiteshipFetchLayerConfig.md)

## Returns

[`LiteshipFetchLayer`](../type-aliases/LiteshipFetchLayer.md)

## Example

```ts
// src/fetch.ts (Astro 7 advanced routing) — the module's default export is a
// Fetchable that runs the layer in front of the Astro pipeline.
import { FetchState, astro } from 'astro/fetch';
import { liteshipFetchLayer } from '@liteship/astro/fetch-layer';
import type { EdgeHostCacheConfig, KVNamespace } from '@liteship/edge';

declare const env: { LITESHIP_BOUNDARY_CACHE: KVNamespace };
declare const boundaries: EdgeHostCacheConfig['boundaries'];

const layer = liteshipFetchLayer({
  edge: { cache: { kv: env.LITESHIP_BOUNDARY_CACHE, boundaries } },
  serveFromEdge: (req) => req.headers.get('Sec-Fetch-Dest') === 'style',
});

const handler = {
  fetch: (request) => layer(request, (req) => astro(new FetchState(req))),
} satisfies import('astro').Fetchable;
// Export `handler` from src/fetch.ts.
```
