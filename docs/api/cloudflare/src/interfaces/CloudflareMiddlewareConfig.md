[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / CloudflareMiddlewareConfig

# Interface: CloudflareMiddlewareConfig

Defined in: [cloudflare/src/middleware.ts:12](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L12)

## Properties

### binding

> `readonly` **binding**: `string`

Defined in: [cloudflare/src/middleware.ts:14](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L14)

KV namespace binding name in wrangler.jsonc.

***

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [cloudflare/src/middleware.ts:16](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L16)

Content address of the boundary whose compiled outputs are cached.

***

### compile

> `readonly` **compile**: (`context`) => `CompiledOutputs` \| `Promise`\<`CompiledOutputs`\>

Defined in: [cloudflare/src/middleware.ts:18](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L18)

Compile function invoked on KV cache miss.

#### Parameters

##### context

`EdgeHostCompileContext`

#### Returns

`CompiledOutputs` \| `Promise`\<`CompiledOutputs`\>

***

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [cloudflare/src/middleware.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L33)

Whether to parse Client Hints (default `true`).

***

### env?

> `readonly` `optional` **env?**: [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md) \| (() => [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md))

Defined in: [cloudflare/src/middleware.ts:40](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L40)

Override the Workers env source. Default reads `env` from `cloudflare:workers`.
Pass a getter in tests or when env is injected by the host framework.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [cloudflare/src/middleware.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L31)

Optional KV key prefix.

***

### theme?

> `readonly` `optional` **theme?**: `ThemeCompileConfig` \| ((`context`) => `ThemeCompileConfig` \| `null` \| `undefined`)

Defined in: [cloudflare/src/middleware.ts:20](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L20)

Optional theme config or per-request resolver.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [cloudflare/src/middleware.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L29)

Cache entry TTL in seconds — an eviction/cost knob, not a freshness
knob. Compiled outputs are content-addressed and never go stale; each
deploy that changes boundary content mints a new `ContentAddress`,
orphaning the old `boundaryId` x tier keys. Workers KV has no eviction
and bills storage, so set a TTL (e.g. `2592000` = 30 days) to reclaim
keys for superseded builds. Omit to cache indefinitely.

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [cloudflare/src/middleware.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L35)

Whether to emit COOP/COEP for `client:worker`.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
