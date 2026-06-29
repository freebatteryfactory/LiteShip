[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostCompileContext

# Interface: EdgeHostCompileContext

Defined in: [edge/src/host-adapter.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L49)

Compile-time context passed to [EdgeHostCacheConfig.compile](EdgeHostCacheConfig.md#compile).

Extends [EdgeHostContext](EdgeHostContext.md) with the already-resolved theme result
(if any) so host compile callbacks can inject theme tokens into the
compiled per-state outputs without recomputation. Carries the identity
of the boundary being compiled so a callback shared across multiple
boundaries can branch -- without it, one compile result would be cached
under every boundary's content address.

## Extends

- [`EdgeHostContext`](EdgeHostContext.md)

## Properties

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [edge/src/host-adapter.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L53)

Content address of the boundary this compile call is for.

***

### boundaryName?

> `readonly` `optional` **boundaryName?**: `string`

Defined in: [edge/src/host-adapter.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L55)

Boundary name, when configured via [EdgeHostCacheConfig.boundaries](EdgeHostCacheConfig.md#boundaries).

***

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Defined in: [edge/src/host-adapter.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L34)

Capabilities parsed from Client Hints.

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`capabilities`](EdgeHostContext.md#capabilities)

***

### theme?

> `readonly` `optional` **theme?**: [`ThemeCompileResult`](ThemeCompileResult.md)

Defined in: [edge/src/host-adapter.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L51)

Pre-compiled theme output, if the adapter resolved one for this request.

***

### tier

> `readonly` **tier**: [`EdgeTierResult`](EdgeTierResult.md)

Defined in: [edge/src/host-adapter.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L36)

Derived tier triple (cap, motion, design).

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`tier`](EdgeHostContext.md#tier)
