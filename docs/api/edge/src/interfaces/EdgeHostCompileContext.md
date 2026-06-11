[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostCompileContext

# Interface: EdgeHostCompileContext

Defined in: [edge/src/host-adapter.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L45)

Compile-time context passed to [EdgeHostCacheConfig.compile](EdgeHostCacheConfig.md#compile).

Extends [EdgeHostContext](EdgeHostContext.md) with the already-resolved theme result
(if any) so host compile callbacks can inject theme tokens into the
compiled per-state outputs without recomputation.

## Extends

- [`EdgeHostContext`](EdgeHostContext.md)

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](https://github.com/heyoub/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: [edge/src/host-adapter.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L33)

Capabilities parsed from Client Hints.

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`capabilities`](EdgeHostContext.md#capabilities)

***

### theme?

> `readonly` `optional` **theme?**: [`ThemeCompileResult`](ThemeCompileResult.md)

Defined in: [edge/src/host-adapter.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L47)

Pre-compiled theme output, if the adapter resolved one for this request.

***

### tier

> `readonly` **tier**: [`EdgeTierResult`](EdgeTierResult.md)

Defined in: [edge/src/host-adapter.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L35)

Derived tier triple (cap, motion, design).

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`tier`](EdgeHostContext.md#tier)
