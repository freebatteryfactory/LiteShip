[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / LiteshipMiddlewareConfig

# Interface: LiteshipMiddlewareConfig

Defined in: astro/dist/middleware.d.ts:71

Options accepted by [liteshipMiddleware](../functions/liteshipMiddleware.md).

Omit `edge` to run in pure Client-Hints mode. Pass `edge` when you
have an `@liteship/edge` host adapter (KV cache, theme compilation).

## Extended by

- [`LiteshipFetchLayerConfig`](LiteshipFetchLayerConfig.md)

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: astro/dist/middleware.d.ts:75

Whether to include the Client Hints request headers (default `true`).

***

### edge?

> `readonly` `optional` **edge?**: `EdgeHostAdapterConfig`

Defined in: astro/dist/middleware.d.ts:73

Edge host adapter configuration (KV cache, theme compilation).

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: astro/dist/middleware.d.ts:82

Whether to emit COOP/COEP headers for worker features. `coep`
selects the embedder policy value (default `'require-corp'`);
`'credentialless'` keeps cross-origin isolation while tolerating
CORP-less third-party assets.

#### coep?

> `readonly` `optional` **coep?**: `"require-corp"` \| `"credentialless"`

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
