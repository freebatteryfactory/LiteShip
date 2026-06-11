[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostBoundaryConfig

# Interface: EdgeHostBoundaryConfig

Defined in: [edge/src/host-adapter.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L64)

Outputs source for one boundary -- the per-boundary slice of
[EdgeHostCacheConfig](EdgeHostCacheConfig.md). Resolution order per boundary is
`precompiled`, then KV keyed by `(boundaryId, tier)`, then `compile`
(written back to KV). At least one of `precompiled` or `compile` is
required.

## Properties

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L66)

Content address of the boundary being compiled (`Boundary.make`'s `id`).

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => [`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

Defined in: [edge/src/host-adapter.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L73)

Compile function invoked when neither `precompiled` nor KV has the tier.

#### Parameters

##### context

[`EdgeHostCompileContext`](EdgeHostCompileContext.md)

#### Returns

[`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

***

### precompiled?

> `readonly` `optional` **precompiled?**: `Readonly`\<`Partial`\<`Record`\<`"none:standard"` \| `"none:minimal"` \| `"none:enhanced"` \| `"none:rich"` \| `"transitions:standard"` \| `"transitions:minimal"` \| `"transitions:enhanced"` \| `"transitions:rich"` \| `"animations:standard"` \| `"animations:minimal"` \| `"animations:enhanced"` \| `"animations:rich"` \| `"physics:standard"` \| `"physics:minimal"` \| `"physics:enhanced"` \| `"physics:rich"` \| `"compute:standard"` \| `"compute:minimal"` \| `"compute:enhanced"` \| `"compute:rich"`, [`CompiledOutputs`](CompiledOutputs.md)\>\>\>

Defined in: [edge/src/host-adapter.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L71)

Build-derived outputs keyed by [TierKey](../type-aliases/TierKey.md) -- the `outputsByTier`
field of a boundary manifest entry. Checked before KV.
