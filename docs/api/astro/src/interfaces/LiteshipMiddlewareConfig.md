[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / LiteshipMiddlewareConfig

# Interface: LiteshipMiddlewareConfig

Defined in: [astro/src/middleware.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L91)

Options accepted by [liteshipMiddleware](../functions/liteshipMiddleware.md).

Omit `edge` to run in pure Client-Hints mode. Pass `edge` when you
have an `@liteship/edge` host adapter (KV cache, theme compilation).

## Extended by

- [`LiteshipFetchLayerConfig`](LiteshipFetchLayerConfig.md)

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [astro/src/middleware.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L95)

Whether to include the Client Hints request headers (default `true`).

***

### edge?

> `readonly` `optional` **edge?**: `EdgeHostAdapterConfig`

Defined in: [astro/src/middleware.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L93)

Edge host adapter configuration (KV cache, theme compilation).

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [astro/src/middleware.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L102)

Whether to emit COOP/COEP headers for worker features. `coep`
selects the embedder policy value (default `'require-corp'`);
`'credentialless'` keeps cross-origin isolation while tolerating
CORP-less third-party assets.

#### coep?

> `readonly` `optional` **coep?**: `"require-corp"` \| `"credentialless"`

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
