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

Defined in: [cloudflare/src/middleware.ts:26](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L26)

Whether to parse Client Hints (default `true`).

***

### env?

> `readonly` `optional` **env?**: [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md) \| (() => [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md))

Defined in: [cloudflare/src/middleware.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L33)

Override the Workers env source. Default reads `env` from `cloudflare:workers`.
Pass a getter in tests or when env is injected by the host framework.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [cloudflare/src/middleware.ts:24](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L24)

Optional KV key prefix.

***

### theme?

> `readonly` `optional` **theme?**: `ThemeCompileConfig` \| ((`context`) => `ThemeCompileConfig` \| `null` \| `undefined`)

Defined in: [cloudflare/src/middleware.ts:20](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L20)

Optional theme config or per-request resolver.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [cloudflare/src/middleware.ts:22](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L22)

Cache entry TTL in seconds.

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [cloudflare/src/middleware.ts:28](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L28)

Whether to emit COOP/COEP for `client:worker`.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
