[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostResolution

# Interface: EdgeHostResolution

Defined in: [edge/src/host-adapter.ts:113](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L113)

Full per-request resolution output from [EdgeHostAdapter.resolve](EdgeHostAdapter.md#resolve).

Carries the device context, optional theme and compiled outputs, the
`data-czap-*` attribute string for the root HTML element, and the
`Accept-CH`/`Critical-CH` headers the response should send back.

## Extends

- [`EdgeHostContext`](EdgeHostContext.md)

## Properties

### cacheStatus

> `readonly` **cacheStatus**: [`EdgeHostCacheStatus`](../type-aliases/EdgeHostCacheStatus.md)

Defined in: [edge/src/host-adapter.ts:128](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L128)

Whether the boundary outputs came from cache, were computed and stored, or caching is off.

***

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](https://github.com/heyoub/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: [edge/src/host-adapter.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L33)

Capabilities parsed from Client Hints.

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`capabilities`](EdgeHostContext.md#capabilities)

***

### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: [`CompiledOutputs`](CompiledOutputs.md)

Defined in: [edge/src/host-adapter.ts:117](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L117)

Compiled per-state outputs for the configured boundary, if caching is enabled.

***

### htmlAttributes

> `readonly` **htmlAttributes**: `string`

Defined in: [edge/src/host-adapter.ts:119](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L119)

`data-czap-cap`/`data-czap-motion`/`data-czap-design` string for `<html>`.

***

### responseHeaders

> `readonly` **responseHeaders**: `object`

Defined in: [edge/src/host-adapter.ts:121](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L121)

Response headers to send back so the browser will supply hints next time.

#### acceptCH

> `readonly` **acceptCH**: `string`

`Accept-CH` header value.

#### criticalCH

> `readonly` **criticalCH**: `string`

`Critical-CH` header value.

***

### theme?

> `readonly` `optional` **theme?**: [`ThemeCompileResult`](ThemeCompileResult.md)

Defined in: [edge/src/host-adapter.ts:115](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L115)

Compiled theme result, if a theme config was resolved for this request.

***

### tier

> `readonly` **tier**: [`EdgeTierResult`](EdgeTierResult.md)

Defined in: [edge/src/host-adapter.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L35)

Derived tier triple (cap, motion, design).

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`tier`](EdgeHostContext.md#tier)
