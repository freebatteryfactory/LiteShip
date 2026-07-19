[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / LiteshipFetchLayerConfig

# Interface: LiteshipFetchLayerConfig

Defined in: [astro/src/fetch-layer.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L54)

Options for [liteshipFetchLayer](../functions/liteshipFetchLayer.md). Extends [LiteshipMiddlewareConfig](LiteshipMiddlewareConfig.md) so the
`edge` / `detect` / `workers` surface is shared verbatim — a consumer migrates
from middleware to layer by swapping the factory, not relearning config.

## Extends

- [`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md)

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [astro/src/middleware.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L98)

Whether to include the Client Hints request headers (default `true`).

#### Inherited from

[`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md).[`detect`](LiteshipMiddlewareConfig.md#detect)

***

### edge?

> `readonly` `optional` **edge?**: `EdgeHostAdapterConfig`

Defined in: [astro/src/middleware.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L96)

Edge host adapter configuration (KV cache, theme compilation).

#### Inherited from

[`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md).[`edge`](LiteshipMiddlewareConfig.md#edge)

***

### render?

> `readonly` `optional` **render?**: (`resolution`) => `Response`

Defined in: [astro/src/fetch-layer.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L68)

How to render the edge-served Response from a resolution. Default:
[serializeBoundaryCss](../functions/serializeBoundaryCss.md) wrapped in a `text/css` Response. Override to
match a specific page's exact inlining.

#### Parameters

##### resolution

`EdgeHostResolution`

#### Returns

`Response`

***

### serveFromEdge?

> `readonly` `optional` **serveFromEdge?**: (`request`, `resolution`) => `boolean`

Defined in: [astro/src/fetch-layer.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L62)

Edge-serve predicate. Given the request and the resolution, decide whether to
serve the boundary CSS straight from the edge (returning WITHOUT invoking
Astro) instead of passing through to `next()`. Default: never — the layer
always passes through until a consumer opts edge serve in (e.g.
`(req) => req.headers.get('Sec-Fetch-Dest') === 'style'`).

#### Parameters

##### request

`Request`

##### resolution

`EdgeHostResolution`

#### Returns

`boolean`

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [astro/src/middleware.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L105)

Whether to emit COOP/COEP headers for worker features. `coep`
selects the embedder policy value (default `'require-corp'`);
`'credentialless'` keeps cross-origin isolation while tolerating
CORP-less third-party assets.

#### coep?

> `readonly` `optional` **coep?**: `"require-corp"` \| `"credentialless"`

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### Inherited from

[`LiteshipMiddlewareConfig`](LiteshipMiddlewareConfig.md).[`workers`](LiteshipMiddlewareConfig.md#workers)
