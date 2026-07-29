[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/astro](../README.md) / FetchLayerNext

# Type Alias: FetchLayerNext

> **FetchLayerNext** = (`request`) => `Response` \| `Promise`\<`Response`\>

Defined in: astro/dist/fetch-layer.d.ts:38

The downstream handler a layer wraps — typically the Astro pipeline
(`(req) => astro(new FetchState(req))` from `astro/fetch`). Mirrors Astro 7's
own `FetchHandler` shape (`(request) => Response | Promise<Response>`).

## Parameters

### request

`Request`

## Returns

`Response` \| `Promise`\<`Response`\>
