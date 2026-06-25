[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / czapFetchLayer

# Function: czapFetchLayer()

> **czapFetchLayer**(`config?`): [`CzapFetchLayer`](../type-aliases/CzapFetchLayer.md)

Defined in: [astro/src/fetch-layer.ts:156](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L156)

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

const layer = czapFetchLayer({
  edge: { cache: { kv: env.CZAP_BOUNDARY_CACHE, boundaries } },
  serveFromEdge: (req) => req.headers.get('Sec-Fetch-Dest') === 'style',
});

const handler = {
  fetch: (request) => layer(request, (req) => astro(new FetchState(req))),
} satisfies import('astro').Fetchable;
// `handler` is then the default export of src/fetch.ts.
```
