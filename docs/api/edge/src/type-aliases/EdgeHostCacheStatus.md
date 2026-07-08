[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostCacheStatus

# Type Alias: EdgeHostCacheStatus

> **EdgeHostCacheStatus** = `"disabled"` \| `"precompiled"` \| `"hit"` \| `"miss"`

Defined in: [edge/src/host-adapter.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L186)

Cache lookup outcome reported in [EdgeHostResolution](../interfaces/EdgeHostResolution.md).
`'precompiled'` means the outputs came from the build-derived manifest
without touching KV.
