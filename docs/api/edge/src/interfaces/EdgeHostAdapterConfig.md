[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostAdapterConfig

# Interface: EdgeHostAdapterConfig

Defined in: [edge/src/host-adapter.ts:169](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L169)

Configuration for [createEdgeHostAdapter](../functions/createEdgeHostAdapter.md).

`theme` may be a static [ThemeCompileConfig](ThemeCompileConfig.md), a per-request
resolver function, or absent. `cache` enables a KV-backed boundary
compile cache keyed by content address + tier. When `background` is
present, boundary-cache write-back on a compile miss is scheduled via
`waitUntil` instead of blocking the response (#122).

## Properties

### background?

> `readonly` `optional` **background?**: `EdgeHostBackground`

Defined in: [edge/src/host-adapter.ts:178](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L178)

When present, boundary-cache write-back on a compile miss is scheduled via
`waitUntil` instead of blocking the response (#122).

***

### cache?

> `readonly` `optional` **cache?**: [`EdgeHostCacheConfig`](EdgeHostCacheConfig.md)

Defined in: [edge/src/host-adapter.ts:173](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L173)

KV-backed boundary output cache; omit to disable caching.

***

### theme?

> `readonly` `optional` **theme?**: [`ThemeCompileConfig`](ThemeCompileConfig.md) \| ((`context`) => [`ThemeCompileConfig`](ThemeCompileConfig.md) \| `null` \| `undefined`)

Defined in: [edge/src/host-adapter.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L171)

Static theme config, or a resolver invoked with each request's context.
