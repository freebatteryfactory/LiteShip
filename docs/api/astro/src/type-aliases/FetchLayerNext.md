[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / FetchLayerNext

# Type Alias: FetchLayerNext

> **FetchLayerNext** = (`request`) => `Response` \| `Promise`\<`Response`\>

Defined in: [astro/src/fetch-layer.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L43)

The downstream handler a layer wraps — typically the Astro pipeline
(`(req) => astro(new FetchState(req))` from `astro/fetch`). Mirrors Astro 7's
own `FetchHandler` shape (`(request) => Response | Promise<Response>`).

## Parameters

### request

`Request`

## Returns

`Response` \| `Promise`\<`Response`\>
