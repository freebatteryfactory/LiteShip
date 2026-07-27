[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / EdgeHostResolution

# Interface: EdgeHostResolution

Defined in: [\_spine/edge.d.ts:300](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L300)

Tier, theme, boundary, asset, and cache evidence returned by an edge host.

## Extends

- [`EdgeHostContext`](EdgeHostContext.md)

## Properties

### assetUrl?

> `readonly` `optional` **assetUrl?**: `string`

Defined in: [\_spine/edge.d.ts:303](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L303)

***

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryResolution`](EdgeHostBoundaryResolution.md)\>\>

Defined in: [\_spine/edge.d.ts:304](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L304)

***

### cacheStatus

> `readonly` **cacheStatus**: [`EdgeHostCacheStatus`](../type-aliases/EdgeHostCacheStatus.md)

Defined in: [\_spine/edge.d.ts:312](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L312)

***

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [\_spine/edge.d.ts:239](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L239)

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`capabilities`](EdgeHostContext.md#capabilities)

***

### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: [`CompiledOutputs`](CompiledOutputs.md)

Defined in: [\_spine/edge.d.ts:302](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L302)

***

### htmlAttributes

> `readonly` **htmlAttributes**: `string`

Defined in: [\_spine/edge.d.ts:305](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L305)

***

### htmlAttributesMap

> `readonly` **htmlAttributesMap**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [\_spine/edge.d.ts:307](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L307)

Spreadable map form of [htmlAttributes](#htmlattributes), keyed by `data-liteship-<axis>` (auto-includes every `CAP_AXES` axis).

***

### responseHeaders

> `readonly` **responseHeaders**: `object`

Defined in: [\_spine/edge.d.ts:308](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L308)

#### acceptCH

> `readonly` **acceptCH**: `string`

#### criticalCH

> `readonly` **criticalCH**: `string`

***

### theme?

> `readonly` `optional` **theme?**: [`ThemeCompileResult`](ThemeCompileResult.md)

Defined in: [\_spine/edge.d.ts:301](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L301)

***

### tier

> `readonly` **tier**: [`EdgeTierResult`](EdgeTierResult.md)

Defined in: [\_spine/edge.d.ts:240](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L240)

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`tier`](EdgeHostContext.md#tier)
