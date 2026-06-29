[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryManifestEntry

# Interface: BoundaryManifestEntry

Defined in: [edge/src/manifest.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L107)

One boundary's manifest entry: its minted `ContentAddress` (always
`Boundary.make`'s id -- never hand-typed) plus precompiled
[CompiledOutputs](CompiledOutputs.md) for the tier grid, deduplicated.

Most of a boundary's compiled CSS is tier-invariant (the container
queries adapt via `@container`, not per tier), so storing the strings
once per grid cell would ship ~20 copies of the same bytes to the edge
host. Instead `outputs` is a pool of the DISTINCT compiled outputs and
`outputsByTier` maps each [TierKey](../type-aliases/TierKey.md) to a pool index. Hosts call
[resolveOutputsByTier](../functions/resolveOutputsByTier.md) to inflate the per-tier map back to the
exact same bytes the build compiled.

`assetUrls`, when present, maps the SAME pooled output indices to immutable
static-asset URLs emitted by the build. It is optional and additive: hosts
that do not opt into static asset emission keep using `outputs` directly.

Both fields are empty when the boundary has no `@quantize` CSS block
(nothing to compile) -- the entry still carries the id so hosts can
derive cache configuration from it.

## Properties

### assetUrls?

> `readonly` `optional` **assetUrls?**: `Readonly`\<`Record`\<`number`, `string`\>\>

Defined in: [edge/src/manifest.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L115)

Optional immutable static-asset URL per output-pool index.

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [edge/src/manifest.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L109)

Content address minted by `Boundary.make` (`fnv1a:xxxxxxxx`).

***

### outputs

> `readonly` **outputs**: readonly [`CompiledOutputs`](CompiledOutputs.md)[]

Defined in: [edge/src/manifest.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L111)

Deduplicated pool of distinct compiled outputs; `outputsByTier` cells index into it.

***

### outputsByTier

> `readonly` **outputsByTier**: `Readonly`\<`Partial`\<`Record`\<[`TierKey`](../type-aliases/TierKey.md), `number`\>\>\>

Defined in: [edge/src/manifest.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L113)

Pool index per [TierKey](../type-aliases/TierKey.md); missing keys mean that tier was never compiled.
