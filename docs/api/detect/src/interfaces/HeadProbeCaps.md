[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / HeadProbeCaps

# Interface: HeadProbeCaps

Defined in: detect/src/head-probe.ts:34

The minimal primitive capability shape the cap-level / motion ladders read.

A structural subset of `DeviceCapabilities` / `ExtendedDeviceCapabilities`,
carrying only the fields the two ladders consume. Keeping it to primitives
(no imports, no methods) is what lets the ladder function bodies be emitted
verbatim into the browser head script via `.toString()`.

## Properties

### cores

> `readonly` **cores**: `number`

Defined in: detect/src/head-probe.ts:36

***

### gpu

> `readonly` **gpu**: [`GPUTier`](../type-aliases/GPUTier.md)

Defined in: detect/src/head-probe.ts:35

***

### memory

> `readonly` **memory**: `number`

Defined in: detect/src/head-probe.ts:37

***

### prefersReducedMotion

> `readonly` **prefersReducedMotion**: `boolean`

Defined in: detect/src/head-probe.ts:39

***

### webgpu

> `readonly` **webgpu**: `boolean`

Defined in: detect/src/head-probe.ts:38
