[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [cloudflare/src](../README.md) / CloudflareMiddlewareConfig

# Interface: CloudflareMiddlewareConfig

Defined in: [cloudflare/src/middleware.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L25)

Configuration for the request-scoped Cloudflare middleware adapter.

## Properties

### binding?

> `readonly` `optional` **binding?**: `string`

Defined in: [cloudflare/src/middleware.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L27)

KV namespace binding name in wrangler.jsonc. Defaults to `LITESHIP_BOUNDARY_CACHE`.

***

### boundary?

> `readonly` `optional` **boundary?**: `string` \| readonly `string`[]

Defined in: [cloudflare/src/middleware.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L41)

Which manifest boundaries to serve: a single name, a list of names,
or omitted to serve every boundary in the manifest. Each served
boundary keeps its own cache identity (content address), so
boundaries on the same page cannot poison each other's cached CSS.

***

### boundaryId?

> `readonly` `optional` **boundaryId?**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [cloudflare/src/middleware.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L49)

Escape hatch for custom hosts without a manifest: the boundary's
content address. Must be a real minted id (`defineBoundary(...).id`,
`fnv1a:xxxxxxxx`) -- the KV keyspace is content-addressed, so a
fabricated id breaks content-addressing (the cache could then serve a
different boundary's compiled CSS).

***

### cacheTtl?

> `readonly` `optional` **cacheTtl?**: `number`

Defined in: [cloudflare/src/middleware.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L72)

Cloudflare KV edge-cache TTL passed to `KV.get`; distinct from write expiration.

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => `CompiledOutputs` \| `Promise`\<`CompiledOutputs`\>

Defined in: [cloudflare/src/middleware.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L56)

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

Defined in: [cloudflare/src/middleware.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L83)

Whether to parse Client Hints (default `true`).

***

### env?

> `readonly` `optional` **env?**: [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md) \| (() => [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md))

Defined in: [cloudflare/src/middleware.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L90)

Override the Workers env source. Default reads `env` from `cloudflare:workers`.
Pass a getter in tests or when env is injected by the host framework.

***

### expirationTtl?

> `readonly` `optional` **expirationTtl?**: `number`

Defined in: [cloudflare/src/middleware.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L70)

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

### manifest?

> `readonly` `optional` **manifest?**: `Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\> \| `BoundaryManifestFile`

Defined in: [cloudflare/src/middleware.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L34)

Build-derived boundary manifest -- import it from
`virtual:liteship/boundaries` or read the emitted
`liteship-boundary-manifest.json`. The middleware derives `boundaryId`
and per-tier precompiled outputs from it, so nothing is hand-typed.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [cloudflare/src/middleware.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L74)

Optional KV key prefix.

***

### resolveExecutionContext?

> `readonly` `optional` **resolveExecutionContext?**: (`context`) => [`CloudflareExecutionContext`](CloudflareExecutionContext.md) \| `undefined`

Defined in: [cloudflare/src/middleware.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L95)

Resolve the per-request Workers execution context for tests or custom
hosts. Astro Cloudflare uses `context.locals.cfContext` automatically.

#### Parameters

##### context

[`CloudflareRequestContext`](CloudflareRequestContext.md)

#### Returns

[`CloudflareExecutionContext`](CloudflareExecutionContext.md) \| `undefined`

***

### tags?

> `readonly` `optional` **tags?**: `EdgeHostCacheTags` \| `Readonly`\<`Record`\<`string`, `EdgeHostCacheTags`\>\>

Defined in: [cloudflare/src/middleware.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L81)

Tags written with boundary cache entries when a compile fallback fills KV.
Pass the same values as Astro `routeRules.tags` so `cache.invalidate({ tags })`
can purge LiteShip boundary variants. A manifest config may use a boundary-name
map; a resolver can branch on `context.boundaryName` / `context.boundaryId`.

***

### theme?

> `readonly` `optional` **theme?**: `ThemeCompileConfig` \| ((`context`) => `ThemeCompileConfig` \| `null` \| `undefined`)

Defined in: [cloudflare/src/middleware.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L58)

Optional theme config or per-request resolver.

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [cloudflare/src/middleware.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L85)

Whether to emit COOP/COEP for `client:worker`.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
