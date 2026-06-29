[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostResolution

# Interface: EdgeHostResolution

Defined in: [edge/src/host-adapter.ts:197](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L197)

Full per-request resolution output from [EdgeHostAdapter.resolve](EdgeHostAdapter.md#resolve).

Carries the device context, optional theme and compiled outputs, the
`data-czap-*` attribute string for the root HTML element, and the
`Accept-CH`/`Critical-CH` headers the response should send back.

## Extends

- [`EdgeHostContext`](EdgeHostContext.md)

## Properties

### assetUrl?

> `readonly` `optional` **assetUrl?**: `string`

Defined in: [edge/src/host-adapter.ts:207](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L207)

Immutable static-asset URL when exactly one boundary is configured and emitted one.

***

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryResolution`](EdgeHostBoundaryResolution.md)\>\>

Defined in: [edge/src/host-adapter.ts:209](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L209)

Per-boundary outcomes, keyed by name; present with the `boundaries` cache form.

***

### cacheStatus

> `readonly` **cacheStatus**: [`EdgeHostCacheStatus`](../type-aliases/EdgeHostCacheStatus.md)

Defined in: [edge/src/host-adapter.ts:225](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L225)

Whether boundary outputs came from cache, were computed and stored,
or caching is off. With multiple boundaries this is the worst case
across them (worst-to-best: `miss`, `hit`, `precompiled`);
per-boundary statuses live in [boundaries](#boundaries).

***

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: [edge/src/host-adapter.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L34)

Capabilities parsed from Client Hints.

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`capabilities`](EdgeHostContext.md#capabilities)

***

### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: [`CompiledOutputs`](CompiledOutputs.md)

Defined in: [edge/src/host-adapter.ts:205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L205)

Compiled per-state outputs when exactly one boundary is configured
(either form). Undefined with multiple boundaries -- read
[boundaries](#boundaries) instead.

***

### htmlAttributes

> `readonly` **htmlAttributes**: `string`

Defined in: [edge/src/host-adapter.ts:211](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L211)

`data-czap-tier`/`data-czap-motion`/`data-czap-design` string for `<html>` (one per `CAP_AXES`).

***

### responseHeaders

> `readonly` **responseHeaders**: `object`

Defined in: [edge/src/host-adapter.ts:213](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L213)

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

Defined in: [edge/src/host-adapter.ts:199](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L199)

Compiled theme result, if a theme config was resolved for this request.

***

### tier

> `readonly` **tier**: [`EdgeTierResult`](EdgeTierResult.md)

Defined in: [edge/src/host-adapter.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L36)

Derived tier triple (cap, motion, design).

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`tier`](EdgeHostContext.md#tier)
