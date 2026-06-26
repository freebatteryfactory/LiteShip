[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / CloudflareMiddlewareConfig

# Interface: CloudflareMiddlewareConfig

Defined in: [cloudflare/src/middleware.ts:21](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L21)

## Properties

### binding?

> `readonly` `optional` **binding?**: `string`

Defined in: [cloudflare/src/middleware.ts:23](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L23)

KV namespace binding name in wrangler.jsonc. Defaults to `CZAP_BOUNDARY_CACHE`.

***

### boundary?

> `readonly` `optional` **boundary?**: `string` \| readonly `string`[]

Defined in: [cloudflare/src/middleware.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L37)

Which manifest boundaries to serve: a single name, a list of names,
or omitted to serve every boundary in the manifest. Each served
boundary keeps its own cache identity (content address), so
boundaries on the same page cannot poison each other's cached CSS.

***

### boundaryId?

> `readonly` `optional` **boundaryId?**: `ContentAddress`

Defined in: [cloudflare/src/middleware.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L45)

Escape hatch for custom hosts without a manifest: the boundary's
content address. Must be a real minted id (`Boundary.make(...).id`,
`fnv1a:xxxxxxxx`) -- the KV keyspace is content-addressed, so a
fabricated id breaks content-addressing (the cache could then serve a
different boundary's compiled CSS).

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => `CompiledOutputs` \| `Promise`\<`CompiledOutputs`\>

Defined in: [cloudflare/src/middleware.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L52)

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

Defined in: [cloudflare/src/middleware.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L77)

Whether to parse Client Hints (default `true`).

***

### env?

> `readonly` `optional` **env?**: [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md) \| (() => [`CloudflareWorkersEnv`](../type-aliases/CloudflareWorkersEnv.md))

Defined in: [cloudflare/src/middleware.ts:84](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L84)

Override the Workers env source. Default reads `env` from `cloudflare:workers`.
Pass a getter in tests or when env is injected by the host framework.

***

### manifest?

> `readonly` `optional` **manifest?**: `Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\> \| `BoundaryManifestFile`

Defined in: [cloudflare/src/middleware.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L30)

Build-derived boundary manifest -- import it from
`virtual:czap/boundaries` or read the emitted
`czap-boundary-manifest.json`. The middleware derives `boundaryId`
and per-tier precompiled outputs from it, so nothing is hand-typed.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [cloudflare/src/middleware.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L68)

Optional KV key prefix.

***

### tags?

> `readonly` `optional` **tags?**: `EdgeHostCacheTags` \| `Readonly`\<`Record`\<`string`, `EdgeHostCacheTags`\>\>

Defined in: [cloudflare/src/middleware.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L75)

Tags written with boundary cache entries when a compile fallback fills KV.
Pass the same values as Astro `routeRules.tags` so `cache.invalidate({ tags })`
can purge CZAP boundary variants. A manifest config may use a boundary-name
map; a resolver can branch on `context.boundaryName` / `context.boundaryId`.

***

### theme?

> `readonly` `optional` **theme?**: `ThemeCompileConfig` \| ((`context`) => `ThemeCompileConfig` \| `null` \| `undefined`)

Defined in: [cloudflare/src/middleware.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L54)

Optional theme config or per-request resolver.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [cloudflare/src/middleware.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L66)

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

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [cloudflare/src/middleware.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L79)

Whether to emit COOP/COEP for `client:worker`.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
