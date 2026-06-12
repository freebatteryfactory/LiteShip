[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / CloudflareMiddlewareConfig

# Interface: CloudflareMiddlewareConfig

Defined in: [cloudflare/src/middleware.ts:13](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L13)

## Properties

### binding

> `readonly` **binding**: `string`

Defined in: [cloudflare/src/middleware.ts:15](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L15)

KV namespace binding name in wrangler.jsonc.

***

### boundary?

> `readonly` `optional` **boundary?**: `string`

Defined in: [cloudflare/src/middleware.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L27)

Which manifest boundary to serve. Optional when the manifest has
exactly one entry.

***

### boundaryId?

> `readonly` `optional` **boundaryId?**: `ContentAddress`

Defined in: [cloudflare/src/middleware.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L34)

Escape hatch for custom hosts without a manifest: the boundary's
content address. Must be a real minted id (`Boundary.make(...).id`,
`fnv1a:xxxxxxxx`) -- the KV keyspace is content-addressed, so a
fabricated id breaks the never-stale invariant.

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => `CompiledOutputs` \| `Promise`\<`CompiledOutputs`\>

Defined in: [cloudflare/src/middleware.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L39)

Escape hatch / fallback: compile function invoked when neither the
manifest nor KV covers the request's tier.

#### Parameters

##### context

`EdgeHostCompileContext`

#### Returns

`CompiledOutputs` \| `Promise`\<`CompiledOutputs`\>

***

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [cloudflare/src/middleware.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L54)

Whether to parse Client Hints (default `true`).

***

### env?

> `readonly` `optional` **env?**: [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md) \| (() => [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md))

Defined in: [cloudflare/src/middleware.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L61)

Override the Workers env source. Default reads `env` from `cloudflare:workers`.
Pass a getter in tests or when env is injected by the host framework.

***

### manifest?

> `readonly` `optional` **manifest?**: `Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\> \| `BoundaryManifestFile`

Defined in: [cloudflare/src/middleware.ts:22](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L22)

Build-derived boundary manifest -- import it from
`virtual:czap/boundaries` or read the emitted
`czap-boundary-manifest.json`. The middleware derives `boundaryId`
and per-tier precompiled outputs from it, so nothing is hand-typed.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [cloudflare/src/middleware.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L52)

Optional KV key prefix.

***

### theme?

> `readonly` `optional` **theme?**: `ThemeCompileConfig` \| ((`context`) => `ThemeCompileConfig` \| `null` \| `undefined`)

Defined in: [cloudflare/src/middleware.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L41)

Optional theme config or per-request resolver.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [cloudflare/src/middleware.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L50)

Cache entry TTL in seconds — an eviction/cost knob, not a freshness
knob. Compiled outputs are content-addressed and never go stale; each
deploy that changes boundary content mints a new `ContentAddress`,
orphaning the old `boundaryId` x tier keys. Workers KV has no eviction
and bills storage, so set a TTL (e.g. `2592000` = 30 days) to reclaim
keys for superseded builds. Omit to cache indefinitely.

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [cloudflare/src/middleware.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L56)

Whether to emit COOP/COEP for `client:worker`.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
