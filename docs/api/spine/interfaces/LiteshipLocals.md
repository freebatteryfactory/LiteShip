[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / LiteshipLocals

# Interface: LiteshipLocals

Defined in: [\_spine/astro.d.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L123)

LiteShip request-local evidence exposed to Astro pages and middleware.

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [\_spine/astro.d.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L126)

***

### edge?

> `readonly` `optional` **edge?**: `object`

Defined in: [\_spine/astro.d.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L128)

#### assetUrl?

> `readonly` `optional` **assetUrl?**: `string`

#### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryResolution`](EdgeHostBoundaryResolution.md)\>\>

#### cacheStatus

> `readonly` **cacheStatus**: [`EdgeHostCacheStatus`](../type-aliases/EdgeHostCacheStatus.md)

#### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: [`CompiledOutputs`](CompiledOutputs.md)

#### htmlAttributes

> `readonly` **htmlAttributes**: `string`

#### htmlAttributesMap

> `readonly` **htmlAttributesMap**: `Readonly`\<`Record`\<`string`, `string`\>\>

#### theme?

> `readonly` `optional` **theme?**: [`ThemeCompileResult`](ThemeCompileResult.md)

***

### responsiveMedia

> `readonly` **responsiveMedia**: (`intent`) => [`ResponsiveMediaPictureProjection`](ResponsiveMediaPictureProjection.md)

Defined in: [\_spine/astro.d.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L127)

#### Parameters

##### intent

[`ResponsiveMediaIntent`](ResponsiveMediaIntent.md)

#### Returns

[`ResponsiveMediaPictureProjection`](ResponsiveMediaPictureProjection.md)

***

### tierEvidence

> `readonly` **tierEvidence**: [`CapabilityTierEvidence`](../type-aliases/CapabilityTierEvidence.md)

Defined in: [\_spine/astro.d.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L125)

***

### tiers

> `readonly` **tiers**: [`CapabilityAxisValues`](CapabilityAxisValues.md)

Defined in: [\_spine/astro.d.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/astro.d.ts#L124)
