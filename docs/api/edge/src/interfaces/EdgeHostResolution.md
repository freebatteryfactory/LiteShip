[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostResolution

# Interface: EdgeHostResolution

Defined in: [edge/src/host-adapter.ts:174](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L174)

Full per-request resolution output from [EdgeHostAdapter.resolve](EdgeHostAdapter.md#resolve).

Carries the device context, optional theme and compiled outputs, the
`data-czap-*` attribute string for the root HTML element, and the
`Accept-CH`/`Critical-CH` headers the response should send back.

## Extends

- [`EdgeHostContext`](EdgeHostContext.md)

## Properties

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryResolution`](EdgeHostBoundaryResolution.md)\>\>

Defined in: [edge/src/host-adapter.ts:184](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L184)

Per-boundary outcomes, keyed by name; present with the `boundaries` cache form.

***

### cacheStatus

> `readonly` **cacheStatus**: [`EdgeHostCacheStatus`](../type-aliases/EdgeHostCacheStatus.md)

Defined in: [edge/src/host-adapter.ts:200](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L200)

Whether boundary outputs came from cache, were computed and stored,
or caching is off. With multiple boundaries this is the worst case
across them (worst-to-best: `miss`, `hit`, `precompiled`);
per-boundary statuses live in [boundaries](#boundaries).

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

Defined in: [edge/src/host-adapter.ts:182](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L182)

Compiled per-state outputs when exactly one boundary is configured
(either form). Undefined with multiple boundaries -- read
[boundaries](#boundaries) instead.

***

### htmlAttributes

> `readonly` **htmlAttributes**: `string`

Defined in: [edge/src/host-adapter.ts:186](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L186)

`data-czap-tier`/`data-czap-motion`/`data-czap-design` string for `<html>` (one per `CAP_AXES`).

***

### responseHeaders

> `readonly` **responseHeaders**: `object`

Defined in: [edge/src/host-adapter.ts:188](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L188)

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

Defined in: [edge/src/host-adapter.ts:176](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L176)

Compiled theme result, if a theme config was resolved for this request.

***

### tier

> `readonly` **tier**: [`EdgeTierResult`](EdgeTierResult.md)

Defined in: [edge/src/host-adapter.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L35)

Derived tier triple (cap, motion, design).

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`tier`](EdgeHostContext.md#tier)
