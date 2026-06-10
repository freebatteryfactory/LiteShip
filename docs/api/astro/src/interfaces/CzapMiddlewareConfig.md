[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / CzapMiddlewareConfig

# Interface: CzapMiddlewareConfig

Defined in: [astro/src/middleware.ts:49](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L49)

Options accepted by [czapMiddleware](../functions/czapMiddleware.md).

Omit `edge` to run in pure Client-Hints mode. Pass `edge` when you
have an `@czap/edge` host adapter (KV cache, theme compilation).

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [astro/src/middleware.ts:53](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L53)

Whether to include the Client Hints request headers (default `true`).

***

### edge?

> `readonly` `optional` **edge?**: `EdgeHostAdapterConfig`

Defined in: [astro/src/middleware.ts:51](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L51)

Edge host adapter configuration (KV cache, theme compilation).

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [astro/src/middleware.ts:60](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/middleware.ts#L60)

Whether to emit COOP/COEP headers for worker features. `coep`
selects the embedder policy value (default `'require-corp'`);
`'credentialless'` keeps cross-origin isolation while tolerating
CORP-less third-party assets.

#### coep?

> `readonly` `optional` **coep?**: [`CrossOriginEmbedderPolicy`](../type-aliases/CrossOriginEmbedderPolicy.md)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
