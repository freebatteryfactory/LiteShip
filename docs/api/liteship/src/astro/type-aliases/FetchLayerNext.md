[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / FetchLayerNext

# Type Alias: FetchLayerNext

> **FetchLayerNext** = (`request`) => `Response` \| `Promise`\<`Response`\>

Defined in: astro/dist/fetch-layer.d.ts:37

The downstream handler a layer wraps — typically the Astro pipeline
(`(req) => astro(new FetchState(req))` from `astro/fetch`). Mirrors Astro 7's
own `FetchHandler` shape (`(request) => Response | Promise<Response>`).

## Parameters

### request

`Request`

## Returns

`Response` \| `Promise`\<`Response`\>
