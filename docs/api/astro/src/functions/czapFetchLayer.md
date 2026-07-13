[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / czapFetchLayer

# Function: czapFetchLayer()

> **czapFetchLayer**(`config?`): [`CzapFetchLayer`](../type-aliases/CzapFetchLayer.md)

Defined in: [astro/src/fetch-layer.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L162)

Create the czap fetch layer.

## Parameters

### config?

[`CzapFetchLayerConfig`](../interfaces/CzapFetchLayerConfig.md)

## Returns

[`CzapFetchLayer`](../type-aliases/CzapFetchLayer.md)

## Example

```ts
// src/fetch.ts (Astro 7 advanced routing) — the module's default export is a
// Fetchable that runs the layer in front of the Astro pipeline.
import { FetchState, astro } from 'astro/fetch';
import { czapFetchLayer } from '@czap/astro/fetch-layer';
import type { EdgeHostCacheConfig, KVNamespace } from '@czap/edge';

declare const env: { CZAP_BOUNDARY_CACHE: KVNamespace };
declare const boundaries: EdgeHostCacheConfig['boundaries'];

const layer = czapFetchLayer({
  edge: { cache: { kv: env.CZAP_BOUNDARY_CACHE, boundaries } },
  serveFromEdge: (req) => req.headers.get('Sec-Fetch-Dest') === 'style',
});

const handler = {
  fetch: (request) => layer(request, (req) => astro(new FetchState(req))),
} satisfies import('astro').Fetchable;
// Export `handler` from src/fetch.ts.
```
