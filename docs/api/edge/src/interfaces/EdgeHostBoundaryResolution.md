[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostBoundaryResolution

# Interface: EdgeHostBoundaryResolution

Defined in: [edge/src/host-adapter.ts:159](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L159)

Per-boundary resolution outcome, reported in
[EdgeHostResolution.boundaries](EdgeHostResolution.md#boundaries) when the cache is configured with
the multi-boundary form.

## Properties

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:161](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L161)

Content address the outputs were resolved (and cached) under.

***

### cacheStatus

> `readonly` **cacheStatus**: `"precompiled"` \| `"hit"` \| `"miss"`

Defined in: [edge/src/host-adapter.ts:165](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L165)

Where this boundary's outputs came from (`'disabled'` cannot occur per boundary).

***

### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: [`CompiledOutputs`](CompiledOutputs.md)

Defined in: [edge/src/host-adapter.ts:163](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L163)

Compiled per-state outputs; absent on an uncovered tier with no `compile`.
