[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / BoundaryManifestEntry

# Interface: BoundaryManifestEntry

Defined in: [\_spine/edge.d.ts:178](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L178)

One boundary's precompiled target outputs indexed by tier pair.

## Properties

### assetUrls?

> `readonly` `optional` **assetUrls?**: `Readonly`\<`Record`\<`number`, `string`\>\>

Defined in: [\_spine/edge.d.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L182)

***

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/edge.d.ts:179](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L179)

***

### outputs

> `readonly` **outputs**: readonly [`CompiledOutputs`](CompiledOutputs.md)[]

Defined in: [\_spine/edge.d.ts:180](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L180)

***

### outputsByTier

> `readonly` **outputsByTier**: `Readonly`\<`Partial`\<`Record`\<[`TierKey`](../type-aliases/TierKey.md), `number`\>\>\>

Defined in: [\_spine/edge.d.ts:181](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L181)
