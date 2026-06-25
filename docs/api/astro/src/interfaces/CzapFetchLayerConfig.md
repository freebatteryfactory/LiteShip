[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / CzapFetchLayerConfig

# Interface: CzapFetchLayerConfig

Defined in: [astro/src/fetch-layer.ts:53](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L53)

Options for [czapFetchLayer](../functions/czapFetchLayer.md). Extends [CzapMiddlewareConfig](CzapMiddlewareConfig.md) so the
`edge` / `detect` / `workers` surface is shared verbatim — a consumer migrates
from middleware to layer by swapping the factory, not relearning config.

## Extends

- [`CzapMiddlewareConfig`](CzapMiddlewareConfig.md)

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [astro/src/middleware.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L77)

Whether to include the Client Hints request headers (default `true`).

#### Inherited from

[`CzapMiddlewareConfig`](CzapMiddlewareConfig.md).[`detect`](CzapMiddlewareConfig.md#detect)

***

### edge?

> `readonly` `optional` **edge?**: `EdgeHostAdapterConfig`

Defined in: [astro/src/middleware.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L75)

Edge host adapter configuration (KV cache, theme compilation).

#### Inherited from

[`CzapMiddlewareConfig`](CzapMiddlewareConfig.md).[`edge`](CzapMiddlewareConfig.md#edge)

***

### hotPath?

> `readonly` `optional` **hotPath?**: (`request`, `resolution`) => `boolean`

Defined in: [astro/src/fetch-layer.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L61)

Hot-path predicate. Given the request and the resolution, decide whether to
serve the boundary CSS straight from the edge (returning WITHOUT invoking
Astro) instead of passing through to `next()`. Default: never — the layer
always passes through until a consumer opts a hot path in (e.g.
`(req) => req.headers.get('Sec-Fetch-Dest') === 'style'`).

#### Parameters

##### request

`Request`

##### resolution

`EdgeHostResolution`

#### Returns

`boolean`

***

### render?

> `readonly` `optional` **render?**: (`resolution`) => `Response`

Defined in: [astro/src/fetch-layer.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L67)

How to render the hot-path Response from a resolution. Default:
[serializeBoundaryCss](../functions/serializeBoundaryCss.md) wrapped in a `text/css` Response. Override to
match a specific page's exact inlining.

#### Parameters

##### resolution

`EdgeHostResolution`

#### Returns

`Response`

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [astro/src/middleware.ts:84](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L84)

Whether to emit COOP/COEP headers for worker features. `coep`
selects the embedder policy value (default `'require-corp'`);
`'credentialless'` keeps cross-origin isolation while tolerating
CORP-less third-party assets.

#### coep?

> `readonly` `optional` **coep?**: [`CrossOriginEmbedderPolicy`](../type-aliases/CrossOriginEmbedderPolicy.md)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### Inherited from

[`CzapMiddlewareConfig`](CzapMiddlewareConfig.md).[`workers`](CzapMiddlewareConfig.md#workers)
