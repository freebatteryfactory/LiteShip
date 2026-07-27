[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / BoundaryManifestEntry

# Interface: BoundaryManifestEntry

Defined in: [\_spine/edge.d.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L158)

One boundary's precompiled target outputs indexed by tier pair.

## Properties

### assetUrls?

> `readonly` `optional` **assetUrls?**: `Readonly`\<`Record`\<`number`, `string`\>\>

Defined in: [\_spine/edge.d.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L162)

***

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/edge.d.ts:159](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L159)

***

### outputs

> `readonly` **outputs**: readonly [`CompiledOutputs`](CompiledOutputs.md)[]

Defined in: [\_spine/edge.d.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L160)

***

### outputsByTier

> `readonly` **outputsByTier**: `Readonly`\<`Partial`\<`Record`\<[`TierKey`](../type-aliases/TierKey.md), `number`\>\>\>

Defined in: [\_spine/edge.d.ts:161](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L161)
