[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostResolution

# Interface: EdgeHostResolution

Defined in: [edge/src/host-adapter.ts:198](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L198)

Full per-request resolution output from [EdgeHostAdapter.resolve](EdgeHostAdapter.md#resolve).

Carries the device context, optional theme and compiled outputs, the
`data-czap-*` attribute string for the root HTML element, and the
`Accept-CH`/`Critical-CH` headers the response should send back.

## Extends

- [`EdgeHostContext`](EdgeHostContext.md)

## Properties

### assetUrl?

> `readonly` `optional` **assetUrl?**: `string`

Defined in: [edge/src/host-adapter.ts:208](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L208)

Immutable static-asset URL when exactly one boundary is configured and emitted one.

***

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, [`EdgeHostBoundaryResolution`](EdgeHostBoundaryResolution.md)\>\>

Defined in: [edge/src/host-adapter.ts:210](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L210)

Per-boundary outcomes, keyed by name; present with the `boundaries` cache form.

***

### cacheStatus

> `readonly` **cacheStatus**: [`EdgeHostCacheStatus`](../type-aliases/EdgeHostCacheStatus.md)

Defined in: [edge/src/host-adapter.ts:226](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L226)

Whether boundary outputs came from cache, were computed and stored,
or caching is off. With multiple boundaries this is the worst case
across them (worst-to-best: `miss`, `hit`, `precompiled`);
per-boundary statuses live in [boundaries](#boundaries).

***

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](https://github.com/heyoub/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: [edge/src/host-adapter.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L34)

Capabilities parsed from Client Hints.

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`capabilities`](EdgeHostContext.md#capabilities)

***

### compiledOutputs?

> `readonly` `optional` **compiledOutputs?**: [`CompiledOutputs`](CompiledOutputs.md)

Defined in: [edge/src/host-adapter.ts:206](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L206)

Compiled per-state outputs when exactly one boundary is configured
(either form). Undefined with multiple boundaries -- read
[boundaries](#boundaries) instead.

***

### htmlAttributes

> `readonly` **htmlAttributes**: `string`

Defined in: [edge/src/host-adapter.ts:212](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L212)

`data-czap-tier`/`data-czap-motion`/`data-czap-design` string for `<html>` (one per `CAP_AXES`).

***

### responseHeaders

> `readonly` **responseHeaders**: `object`

Defined in: [edge/src/host-adapter.ts:214](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L214)

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

Defined in: [edge/src/host-adapter.ts:200](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L200)

Compiled theme result, if a theme config was resolved for this request.

***

### tier

> `readonly` **tier**: [`EdgeTierResult`](EdgeTierResult.md)

Defined in: [edge/src/host-adapter.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L36)

Derived tier triple (cap, motion, design).

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`tier`](EdgeHostContext.md#tier)
