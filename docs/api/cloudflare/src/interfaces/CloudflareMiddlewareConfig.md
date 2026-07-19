[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / CloudflareMiddlewareConfig

# Interface: CloudflareMiddlewareConfig

Defined in: [cloudflare/src/middleware.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L24)

## Properties

### binding?

> `readonly` `optional` **binding?**: `string`

Defined in: [cloudflare/src/middleware.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L26)

KV namespace binding name in wrangler.jsonc. Defaults to `LITESHIP_BOUNDARY_CACHE`.

***

### boundary?

> `readonly` `optional` **boundary?**: `string` \| readonly `string`[]

Defined in: [cloudflare/src/middleware.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L40)

Which manifest boundaries to serve: a single name, a list of names,
or omitted to serve every boundary in the manifest. Each served
boundary keeps its own cache identity (content address), so
boundaries on the same page cannot poison each other's cached CSS.

***

### boundaryId?

> `readonly` `optional` **boundaryId?**: `ContentAddress`

Defined in: [cloudflare/src/middleware.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L48)

Escape hatch for custom hosts without a manifest: the boundary's
content address. Must be a real minted id (`Boundary.make(...).id`,
`fnv1a:xxxxxxxx`) -- the KV keyspace is content-addressed, so a
fabricated id breaks content-addressing (the cache could then serve a
different boundary's compiled CSS).

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => `CompiledOutputs` \| `Promise`\<`CompiledOutputs`\>

Defined in: [cloudflare/src/middleware.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L55)

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

Defined in: [cloudflare/src/middleware.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L80)

Whether to parse Client Hints (default `true`).

***

### env?

> `readonly` `optional` **env?**: [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md) \| (() => [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md))

Defined in: [cloudflare/src/middleware.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L87)

Override the Workers env source. Default reads `env` from `cloudflare:workers`.
Pass a getter in tests or when env is injected by the host framework.

***

### manifest?

> `readonly` `optional` **manifest?**: `Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\> \| `BoundaryManifestFile`

Defined in: [cloudflare/src/middleware.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L33)

Build-derived boundary manifest -- import it from
`virtual:liteship/boundaries` or read the emitted
`liteship-boundary-manifest.json`. The middleware derives `boundaryId`
and per-tier precompiled outputs from it, so nothing is hand-typed.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [cloudflare/src/middleware.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L71)

Optional KV key prefix.

***

### tags?

> `readonly` `optional` **tags?**: `EdgeHostCacheTags` \| `Readonly`\<`Record`\<`string`, `EdgeHostCacheTags`\>\>

Defined in: [cloudflare/src/middleware.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L78)

Tags written with boundary cache entries when a compile fallback fills KV.
Pass the same values as Astro `routeRules.tags` so `cache.invalidate({ tags })`
can purge LiteShip boundary variants. A manifest config may use a boundary-name
map; a resolver can branch on `context.boundaryName` / `context.boundaryId`.

***

### theme?

> `readonly` `optional` **theme?**: `ThemeCompileConfig` \| ((`context`) => `ThemeCompileConfig` \| `null` \| `undefined`)

Defined in: [cloudflare/src/middleware.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L57)

Optional theme config or per-request resolver.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [cloudflare/src/middleware.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L69)

Cache entry TTL in seconds — an eviction/cost knob, not a freshness
knob. An entry is keyed by boundary content address, tier, name, and
resolved-theme fingerprint, so it never goes stale for a change in any of
those. (A shared `compile` whose output also depends on build-time content
the boundary id does not cover must vary `prefix` per deploy.) Each
deploy that changes boundary content mints a new `ContentAddress`,
orphaning the old `boundaryId` x tier keys. Workers KV has no eviction
and bills storage, so set a TTL (e.g. `2592000` = 30 days) to reclaim
keys for superseded builds. Omit to cache indefinitely.

***

### waitUntil?

> `readonly` `optional` **waitUntil?**: (`promise`) => `void`

Defined in: [cloudflare/src/middleware.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L92)

Workers `ExecutionContext.waitUntil` for deferring KV write-back (#122).
When omitted, boundary-cache writes block the response path.

#### Parameters

##### promise

`Promise`\<`unknown`\>

#### Returns

`void`

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [cloudflare/src/middleware.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L82)

Whether to emit COOP/COEP for `client:worker`.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
