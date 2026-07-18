[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / DeviceCapabilities

# Interface: DeviceCapabilities

Defined in: [detect/src/detect.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L68)

Baseline detected device capabilities.

All probes gracefully fall back to conservative defaults when APIs are
unavailable (SSR, hardened browsers, CI environments). See
[ExtendedDeviceCapabilities](ExtendedDeviceCapabilities.md) for the superset that also carries
accessibility-related media-query results.

## Extended by

- [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

## Properties

### connection?

> `readonly` `optional` **connection?**: `object`

Defined in: [detect/src/detect.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L90)

Network Information API snapshot; undefined when unsupported.

#### downlink

> `readonly` **downlink**: `number`

Downlink estimate in Mb/s.

#### effectiveType

> `readonly` **effectiveType**: `string`

`'slow-2g' | '2g' | '3g' | '4g'`.

#### saveData

> `readonly` **saveData**: `boolean`

Whether the user has opted into data-saving mode.

***

### cores

> `readonly` **cores**: `number`

Defined in: [detect/src/detect.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L72)

Logical CPU cores reported by `navigator.hardwareConcurrency`.

***

### devicePixelRatio

> `readonly` **devicePixelRatio**: `number`

Defined in: [detect/src/detect.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L88)

`window.devicePixelRatio` at detection time.

***

### gpu

> `readonly` **gpu**: [`GPUTier`](../type-aliases/GPUTier.md)

Defined in: [detect/src/detect.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L70)

GPU fidelity bucket; see [GPUTier](../type-aliases/GPUTier.md).

***

### memory

> `readonly` **memory**: `number`

Defined in: [detect/src/detect.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L74)

Device memory in GiB (rounded by the Device Memory API).

***

### prefersColorScheme

> `readonly` **prefersColorScheme**: `"light"` \| `"dark"`

Defined in: [detect/src/detect.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L82)

Effective color scheme (`prefers-color-scheme`).

***

### prefersReducedMotion

> `readonly` **prefersReducedMotion**: `boolean`

Defined in: [detect/src/detect.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L80)

`prefers-reduced-motion: reduce` match.

***

### touchPrimary

> `readonly` **touchPrimary**: `boolean`

Defined in: [detect/src/detect.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L78)

Whether touch is a primary input modality (maxTouchPoints or ontouchstart).

***

### viewportHeight

> `readonly` **viewportHeight**: `number`

Defined in: [detect/src/detect.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L86)

`window.innerHeight` at detection time.

***

### viewportWidth

> `readonly` **viewportWidth**: `number`

Defined in: [detect/src/detect.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L84)

`window.innerWidth` at detection time.

***

### webgpu

> `readonly` **webgpu**: `boolean`

Defined in: [detect/src/detect.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L76)

Whether `navigator.gpu` is present (WebGPU available).
