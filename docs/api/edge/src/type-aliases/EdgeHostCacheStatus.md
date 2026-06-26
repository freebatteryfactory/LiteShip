[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostCacheStatus

# Type Alias: EdgeHostCacheStatus

> **EdgeHostCacheStatus** = `"disabled"` \| `"precompiled"` \| `"hit"` \| `"miss"`

Defined in: [edge/src/host-adapter.ts:173](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L173)

Cache lookup outcome reported in [EdgeHostResolution](../interfaces/EdgeHostResolution.md).
`'precompiled'` means the outputs came from the build-derived manifest
without touching KV.
