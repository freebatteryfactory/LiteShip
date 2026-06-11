[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / CloudflareMiddlewareConfig

# Interface: CloudflareMiddlewareConfig

Defined in: [cloudflare/src/middleware.ts:18](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L18)

## Properties

### binding

> `readonly` **binding**: `string`

Defined in: [cloudflare/src/middleware.ts:20](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L20)

KV namespace binding name in wrangler.jsonc.

***

### boundary?

> `readonly` `optional` **boundary?**: `string` \| readonly `string`[]

Defined in: [cloudflare/src/middleware.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L34)

Which manifest boundaries to serve: a single name, a list of names,
or omitted to serve every boundary in the manifest. Each served
boundary keeps its own cache identity (content address), so
boundaries on the same page cannot poison each other's cached CSS.

***

### boundaryId?

> `readonly` `optional` **boundaryId?**: `ContentAddress`

Defined in: [cloudflare/src/middleware.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L41)

Escape hatch for custom hosts without a manifest: the boundary's
content address. Must be a real minted id (`Boundary.make(...).id`,
`fnv1a:xxxxxxxx`) -- the KV keyspace is content-addressed, so a
fabricated id breaks the never-stale invariant.

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => `CompiledOutputs` \| `Promise`\<`CompiledOutputs`\>

Defined in: [cloudflare/src/middleware.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L48)

Escape hatch / fallback: compile function invoked when neither the
manifest nor KV covers the request's tier. With multiple boundaries
the callback is shared -- branch on `context.boundaryName` /
`context.boundaryId` to return the right boundary's outputs.

#### Parameters

##### context

`EdgeHostCompileContext`

#### Returns

`CompiledOutputs` \| `Promise`\<`CompiledOutputs`\>

***

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [cloudflare/src/middleware.ts:63](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L63)

Whether to parse Client Hints (default `true`).

***

### env?

> `readonly` `optional` **env?**: [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md) \| (() => [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md))

Defined in: [cloudflare/src/middleware.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L70)

Override the Workers env source. Default reads `env` from `cloudflare:workers`.
Pass a getter in tests or when env is injected by the host framework.

***

### manifest?

> `readonly` `optional` **manifest?**: `Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\> \| `BoundaryManifestFile`

Defined in: [cloudflare/src/middleware.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L27)

Build-derived boundary manifest -- import it from
`virtual:czap/boundaries` or read the emitted
`czap-boundary-manifest.json`. The middleware derives `boundaryId`
and per-tier precompiled outputs from it, so nothing is hand-typed.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [cloudflare/src/middleware.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L61)

Optional KV key prefix.

***

### theme?

> `readonly` `optional` **theme?**: `ThemeCompileConfig` \| ((`context`) => `ThemeCompileConfig` \| `null` \| `undefined`)

Defined in: [cloudflare/src/middleware.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L50)

Optional theme config or per-request resolver.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [cloudflare/src/middleware.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L59)

Cache entry TTL in seconds — an eviction/cost knob, not a freshness
knob. Compiled outputs are content-addressed and never go stale; each
deploy that changes boundary content mints a new `ContentAddress`,
orphaning the old `boundaryId` x tier keys. Workers KV has no eviction
and bills storage, so set a TTL (e.g. `2592000` = 30 days) to reclaim
keys for superseded builds. Omit to cache indefinitely.

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [cloudflare/src/middleware.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L65)

Whether to emit COOP/COEP for `client:worker`.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
