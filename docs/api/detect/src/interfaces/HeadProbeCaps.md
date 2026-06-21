[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / HeadProbeCaps

# Interface: HeadProbeCaps

Defined in: [detect/src/head-probe.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/head-probe.ts#L35)

The minimal primitive capability shape the cap-level / motion ladders read.

A structural subset of `DeviceCapabilities` / `ExtendedDeviceCapabilities`,
carrying only the fields the two ladders consume. Keeping it to primitives
(no imports, no methods) is what lets the ladder function bodies be emitted
verbatim into the browser head script via `.toString()`.

## Properties

### cores

> `readonly` **cores**: `number`

Defined in: [detect/src/head-probe.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/head-probe.ts#L37)

***

### gpu

> `readonly` **gpu**: [`GPUTier`](../type-aliases/GPUTier.md)

Defined in: [detect/src/head-probe.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/head-probe.ts#L36)

***

### memory

> `readonly` **memory**: `number`

Defined in: [detect/src/head-probe.ts:38](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/head-probe.ts#L38)

***

### prefersReducedMotion

> `readonly` **prefersReducedMotion**: `boolean`

Defined in: [detect/src/head-probe.ts:40](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/head-probe.ts#L40)

***

### webgpu

> `readonly` **webgpu**: `boolean`

Defined in: [detect/src/head-probe.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/head-probe.ts#L39)
