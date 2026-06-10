[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / DeviceCapabilities

# Interface: DeviceCapabilities

Defined in: [detect/src/detect.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L67)

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

Defined in: [detect/src/detect.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L89)

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

Defined in: [detect/src/detect.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L71)

Logical CPU cores reported by `navigator.hardwareConcurrency`.

***

### devicePixelRatio

> `readonly` **devicePixelRatio**: `number`

Defined in: [detect/src/detect.ts:87](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L87)

`window.devicePixelRatio` at detection time.

***

### gpu

> `readonly` **gpu**: [`GPUTier`](../type-aliases/GPUTier.md)

Defined in: [detect/src/detect.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L69)

GPU fidelity bucket; see [GPUTier](../type-aliases/GPUTier.md).

***

### memory

> `readonly` **memory**: `number`

Defined in: [detect/src/detect.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L73)

Device memory in GiB (rounded by the Device Memory API).

***

### prefersColorScheme

> `readonly` **prefersColorScheme**: `"light"` \| `"dark"`

Defined in: [detect/src/detect.ts:81](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L81)

Effective color scheme (`prefers-color-scheme`).

***

### prefersReducedMotion

> `readonly` **prefersReducedMotion**: `boolean`

Defined in: [detect/src/detect.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L79)

`prefers-reduced-motion: reduce` match.

***

### touchPrimary

> `readonly` **touchPrimary**: `boolean`

Defined in: [detect/src/detect.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L77)

Whether touch is a primary input modality (maxTouchPoints or ontouchstart).

***

### viewportHeight

> `readonly` **viewportHeight**: `number`

Defined in: [detect/src/detect.ts:85](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L85)

`window.innerHeight` at detection time.

***

### viewportWidth

> `readonly` **viewportWidth**: `number`

Defined in: [detect/src/detect.ts:83](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L83)

`window.innerWidth` at detection time.

***

### webgpu

> `readonly` **webgpu**: `boolean`

Defined in: [detect/src/detect.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L75)

Whether `navigator.gpu` is present (WebGPU available).
