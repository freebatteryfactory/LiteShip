[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / EdgeHostResolution

# Interface: EdgeHostResolution

Defined in: [\_spine/edge.d.ts:274](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L274)

Tier, theme, boundary, asset, and cache evidence returned by an edge host.

## Extends

- [`EdgeHostContext`](EdgeHostContext.md)

## Properties

### assetUrl?

> `readonly` `optional` **assetUrl?**: `string`

Defined in: [\_spine/edge.d.ts:277](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L277)

***

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryResolution`](EdgeHostBoundaryResolution.md)\>\>

Defined in: [\_spine/edge.d.ts:278](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L278)

***

### cacheStatus

> `readonly` **cacheStatus**: [`EdgeHostCacheStatus`](../type-aliases/EdgeHostCacheStatus.md)

Defined in: [\_spine/edge.d.ts:286](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L286)

***

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [\_spine/edge.d.ts:219](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L219)

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`capabilities`](EdgeHostContext.md#capabilities)

***

### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: [`CompiledOutputs`](CompiledOutputs.md)

Defined in: [\_spine/edge.d.ts:276](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L276)

***

### htmlAttributes

> `readonly` **htmlAttributes**: `string`

Defined in: [\_spine/edge.d.ts:279](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L279)

***

### htmlAttributesMap

> `readonly` **htmlAttributesMap**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [\_spine/edge.d.ts:281](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L281)

Spreadable map form of [htmlAttributes](#htmlattributes), keyed by `data-liteship-<axis>` (auto-includes every `CAP_AXES` axis).

***

### responseHeaders

> `readonly` **responseHeaders**: `object`

Defined in: [\_spine/edge.d.ts:282](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L282)

#### acceptCH

> `readonly` **acceptCH**: `string`

#### criticalCH

> `readonly` **criticalCH**: `string`

***

### theme?

> `readonly` `optional` **theme?**: [`ThemeCompileResult`](ThemeCompileResult.md)

Defined in: [\_spine/edge.d.ts:275](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L275)

***

### tier

> `readonly` **tier**: [`EdgeTierResult`](EdgeTierResult.md)

Defined in: [\_spine/edge.d.ts:220](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L220)

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`tier`](EdgeHostContext.md#tier)
