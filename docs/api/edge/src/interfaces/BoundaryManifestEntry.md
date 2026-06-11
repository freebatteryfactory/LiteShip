[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryManifestEntry

# Interface: BoundaryManifestEntry

Defined in: [edge/src/manifest.ts:94](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L94)

One boundary's manifest entry: its minted `ContentAddress` (always
`Boundary.make`'s id -- never hand-typed) plus precompiled
[CompiledOutputs](CompiledOutputs.md) keyed by [TierKey](../type-aliases/TierKey.md).

`outputsByTier` is empty when the boundary has no `@quantize` CSS block
(nothing to compile) -- the entry still carries the id so hosts can
derive cache configuration from it.

## Properties

### id

> `readonly` **id**: `ContentAddress`

Defined in: [edge/src/manifest.ts:96](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L96)

Content address minted by `Boundary.make` (`fnv1a:xxxxxxxx`).

***

### outputsByTier

> `readonly` **outputsByTier**: `Readonly`\<`Record`\<`string`, [`CompiledOutputs`](CompiledOutputs.md)\>\>

Defined in: [edge/src/manifest.ts:98](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L98)

Precompiled outputs per tier key (string-keyed to stay JSON-portable).
