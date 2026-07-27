[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / LiteshipLocals

# Interface: LiteshipLocals

Defined in: [\_spine/astro.d.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L76)

LiteShip request-local evidence exposed to Astro pages and middleware.

## Properties

### capabilities

> `readonly` **capabilities**: `unknown`

Defined in: [\_spine/astro.d.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L82)

***

### edge?

> `readonly` `optional` **edge?**: `object`

Defined in: [\_spine/astro.d.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L83)

#### assetUrl?

> `readonly` `optional` **assetUrl?**: `string`

#### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryResolution`](EdgeHostBoundaryResolution.md)\>\>

#### cacheStatus

> `readonly` **cacheStatus**: [`EdgeHostCacheStatus`](../type-aliases/EdgeHostCacheStatus.md)

#### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: `unknown`

#### htmlAttributes

> `readonly` **htmlAttributes**: `string`

#### htmlAttributesMap

> `readonly` **htmlAttributesMap**: `Readonly`\<`Record`\<`string`, `string`\>\>

#### theme?

> `readonly` `optional` **theme?**: `unknown`

***

### tiers

> `readonly` **tiers**: `Readonly`\<\{ `design`: [`DesignTier`](../type-aliases/DesignTier.md); `motion`: [`MotionTier`](../type-aliases/MotionTier.md); `tier`: [`CapTier`](../type-aliases/CapTier.md); \}\>

Defined in: [\_spine/astro.d.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L77)
