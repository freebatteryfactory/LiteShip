[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostBoundaryResolution

# Interface: EdgeHostBoundaryResolution

Defined in: [edge/src/host-adapter.ts:150](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L150)

Per-boundary resolution outcome, reported in
[EdgeHostResolution.boundaries](EdgeHostResolution.md#boundaries) when the cache is configured with
the multi-boundary form.

## Properties

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:152](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L152)

Content address the outputs were resolved (and cached) under.

***

### cacheStatus

> `readonly` **cacheStatus**: `"precompiled"` \| `"hit"` \| `"miss"`

Defined in: [edge/src/host-adapter.ts:156](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L156)

Where this boundary's outputs came from (`'disabled'` cannot occur per boundary).

***

### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: [`CompiledOutputs`](CompiledOutputs.md)

Defined in: [edge/src/host-adapter.ts:154](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L154)

Compiled per-state outputs; absent on an uncovered tier with no `compile`.
