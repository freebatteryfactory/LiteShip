[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostBoundaryResolution

# Interface: EdgeHostBoundaryResolution

Defined in: [edge/src/host-adapter.ts:172](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L172)

Per-boundary resolution outcome, reported in
[EdgeHostResolution.boundaries](EdgeHostResolution.md#boundaries) when the cache is configured with
the multi-boundary form.

## Properties

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:174](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L174)

Content address the outputs were resolved (and cached) under.

***

### cacheStatus

> `readonly` **cacheStatus**: `"precompiled"` \| `"hit"` \| `"miss"`

Defined in: [edge/src/host-adapter.ts:178](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L178)

Where this boundary's outputs came from (`'disabled'` cannot occur per boundary).

***

### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: [`CompiledOutputs`](CompiledOutputs.md)

Defined in: [edge/src/host-adapter.ts:176](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L176)

Compiled per-state outputs; absent on an uncovered tier with no `compile`.
