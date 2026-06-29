[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostBoundaryResolution

# Interface: EdgeHostBoundaryResolution

Defined in: [edge/src/host-adapter.ts:179](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L179)

Per-boundary resolution outcome, reported in
[EdgeHostResolution.boundaries](EdgeHostResolution.md#boundaries) when the cache is configured with
the multi-boundary form.

## Properties

### assetUrl?

> `readonly` `optional` **assetUrl?**: `string`

Defined in: [edge/src/host-adapter.ts:185](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L185)

Immutable static-asset URL for this request's resolved tier, when emitted by the build.

***

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:181](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L181)

Content address the outputs were resolved (and cached) under.

***

### cacheStatus

> `readonly` **cacheStatus**: `"precompiled"` \| `"hit"` \| `"miss"`

Defined in: [edge/src/host-adapter.ts:187](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L187)

Where this boundary's outputs came from (`'disabled'` cannot occur per boundary).

***

### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: [`CompiledOutputs`](CompiledOutputs.md)

Defined in: [edge/src/host-adapter.ts:183](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L183)

Compiled per-state outputs; absent on an uncovered tier with no `compile`.
