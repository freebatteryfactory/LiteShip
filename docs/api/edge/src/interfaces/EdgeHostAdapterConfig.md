[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostAdapterConfig

# Interface: EdgeHostAdapterConfig

Defined in: [edge/src/host-adapter.ts:161](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L161)

Configuration for [createEdgeHostAdapter](../functions/createEdgeHostAdapter.md).

`theme` may be a static [ThemeCompileConfig](ThemeCompileConfig.md), a per-request
resolver function, or absent. `cache` enables a KV-backed boundary
compile cache keyed by content address + tier.

## Properties

### cache?

> `readonly` `optional` **cache?**: [`EdgeHostCacheConfig`](EdgeHostCacheConfig.md)

Defined in: [edge/src/host-adapter.ts:165](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L165)

KV-backed boundary output cache; omit to disable caching.

***

### theme?

> `readonly` `optional` **theme?**: [`ThemeCompileConfig`](ThemeCompileConfig.md) \| ((`context`) => [`ThemeCompileConfig`](ThemeCompileConfig.md) \| `null` \| `undefined`)

Defined in: [edge/src/host-adapter.ts:163](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L163)

Static theme config, or a resolver invoked with each request's context.
