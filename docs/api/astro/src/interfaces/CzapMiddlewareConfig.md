[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / CzapMiddlewareConfig

# Interface: CzapMiddlewareConfig

Defined in: [astro/src/middleware.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L94)

Options accepted by [czapMiddleware](../functions/czapMiddleware.md).

Omit `edge` to run in pure Client-Hints mode. Pass `edge` when you
have an `@czap/edge` host adapter (KV cache, theme compilation).

## Extended by

- [`CzapFetchLayerConfig`](CzapFetchLayerConfig.md)

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [astro/src/middleware.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L98)

Whether to include the Client Hints request headers (default `true`).

***

### edge?

> `readonly` `optional` **edge?**: `EdgeHostAdapterConfig`

Defined in: [astro/src/middleware.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L96)

Edge host adapter configuration (KV cache, theme compilation).

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
