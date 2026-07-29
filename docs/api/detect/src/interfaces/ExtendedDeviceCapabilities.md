[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [detect/src](../README.md) / ExtendedDeviceCapabilities

# Interface: ExtendedDeviceCapabilities

Defined in: [detect/src/detect.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L132)

Extended capabilities adding accessibility and display metadata.

Superset of [DeviceCapabilities](DeviceCapabilities.md) with media-query-derived fields that
feed the [DesignTier](../type-aliases/DesignTier.md) resolver: contrast preferences, forced colors,
reduced transparency, HDR/dynamic range, color gamut, and update rate.

## Extends

- [`DeviceCapabilities`](DeviceCapabilities.md)

## Properties

### colorGamut

> `readonly` **colorGamut**: `"srgb"` \| `"p3"` \| `"rec2020"`

Defined in: [detect/src/detect.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L142)

Display color gamut from `(color-gamut: ...)`.

***

### connection?

> `readonly` `optional` **connection?**: `object`

Defined in: [detect/src/detect.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L97)

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

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`connection`](DeviceCapabilities.md#connection)

***

### cores

> `readonly` **cores**: `number`

Defined in: [detect/src/detect.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L79)

Logical CPU cores reported by `navigator.hardwareConcurrency`.

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`cores`](DeviceCapabilities.md#cores)

***

### devicePixelRatio

> `readonly` **devicePixelRatio**: `number`

Defined in: [detect/src/detect.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L95)

`window.devicePixelRatio` at detection time.

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`devicePixelRatio`](DeviceCapabilities.md#devicepixelratio)

***

### dynamicRange

> `readonly` **dynamicRange**: `"standard"` \| `"high"`

Defined in: [detect/src/detect.ts:140](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L140)

Display dynamic range (HDR) from `(dynamic-range: high)`.

***

### forcedColors

> `readonly` **forcedColors**: `boolean`

Defined in: [detect/src/detect.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L136)

`forced-colors: active` match (high-contrast/OS theme).

***

### gpu

> `readonly` **gpu**: [`GPUTier`](../type-aliases/GPUTier.md)

Defined in: [detect/src/detect.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L77)

GPU fidelity bucket; see [GPUTier](../type-aliases/GPUTier.md).

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`gpu`](DeviceCapabilities.md#gpu)

***

### memory

> `readonly` **memory**: `number`

Defined in: [detect/src/detect.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L81)

Device memory in GiB (rounded by the Device Memory API).

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`memory`](DeviceCapabilities.md#memory)

***

### prefersColorScheme

> `readonly` **prefersColorScheme**: `"light"` \| `"dark"`

Defined in: [detect/src/detect.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L89)

Effective color scheme (`prefers-color-scheme`).

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`prefersColorScheme`](DeviceCapabilities.md#preferscolorscheme)

***

### prefersContrast

> `readonly` **prefersContrast**: `"no-preference"` \| `"more"` \| `"less"` \| `"custom"`

Defined in: [detect/src/detect.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L134)

`prefers-contrast` value.

***

### prefersReducedMotion

> `readonly` **prefersReducedMotion**: `boolean`

Defined in: [detect/src/detect.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L87)

`prefers-reduced-motion: reduce` match.

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`prefersReducedMotion`](DeviceCapabilities.md#prefersreducedmotion)

***

### prefersReducedTransparency

> `readonly` **prefersReducedTransparency**: `boolean`

Defined in: [detect/src/detect.ts:138](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L138)

`prefers-reduced-transparency: reduce` match.

***

### touchPrimary

> `readonly` **touchPrimary**: `boolean`

Defined in: [detect/src/detect.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L85)

Whether touch is a primary input modality (maxTouchPoints or ontouchstart).

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`touchPrimary`](DeviceCapabilities.md#touchprimary)

***

### updateRate

> `readonly` **updateRate**: `"none"` \| `"fast"` \| `"slow"`

Defined in: [detect/src/detect.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L144)

Update rate from `(update: ...)`; `none` = e-ink / print.

***

### viewportHeight

> `readonly` **viewportHeight**: `number`

Defined in: [detect/src/detect.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L93)

`window.innerHeight` at detection time.

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`viewportHeight`](DeviceCapabilities.md#viewportheight)

***

### viewportWidth

> `readonly` **viewportWidth**: `number`

Defined in: [detect/src/detect.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L91)

`window.innerWidth` at detection time.

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`viewportWidth`](DeviceCapabilities.md#viewportwidth)

***

### webgpu

> `readonly` **webgpu**: `boolean`

Defined in: [detect/src/detect.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L83)

Whether `navigator.gpu` is present (WebGPU available).

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`webgpu`](DeviceCapabilities.md#webgpu)
