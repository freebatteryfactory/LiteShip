[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / ExtendedDeviceCapabilities

# Interface: ExtendedDeviceCapabilities

Defined in: [detect/src/detect.ts:125](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L125)

Extended capabilities adding accessibility and display metadata.

Superset of [DeviceCapabilities](DeviceCapabilities.md) with media-query-derived fields that
feed the [DesignTier](../type-aliases/DesignTier.md) resolver: contrast preferences, forced colors,
reduced transparency, HDR/dynamic range, color gamut, and update rate.

## Extends

- [`DeviceCapabilities`](DeviceCapabilities.md)

## Properties

### colorGamut

> `readonly` **colorGamut**: `"srgb"` \| `"p3"` \| `"rec2020"`

Defined in: [detect/src/detect.ts:135](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L135)

Display color gamut from `(color-gamut: ...)`.

***

### connection?

> `readonly` `optional` **connection?**: `object`

Defined in: [detect/src/detect.ts:90](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L90)

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

Defined in: [detect/src/detect.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L72)

Logical CPU cores reported by `navigator.hardwareConcurrency`.

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`cores`](DeviceCapabilities.md#cores)

***

### devicePixelRatio

> `readonly` **devicePixelRatio**: `number`

Defined in: [detect/src/detect.ts:88](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L88)

`window.devicePixelRatio` at detection time.

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`devicePixelRatio`](DeviceCapabilities.md#devicepixelratio)

***

### dynamicRange

> `readonly` **dynamicRange**: `"standard"` \| `"high"`

Defined in: [detect/src/detect.ts:133](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L133)

Display dynamic range (HDR) from `(dynamic-range: high)`.

***

### forcedColors

> `readonly` **forcedColors**: `boolean`

Defined in: [detect/src/detect.ts:129](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L129)

`forced-colors: active` match (high-contrast/OS theme).

***

### gpu

> `readonly` **gpu**: [`GPUTier`](../type-aliases/GPUTier.md)

Defined in: [detect/src/detect.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L70)

GPU fidelity bucket; see [GPUTier](../type-aliases/GPUTier.md).

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`gpu`](DeviceCapabilities.md#gpu)

***

### memory

> `readonly` **memory**: `number`

Defined in: [detect/src/detect.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L74)

Device memory in GiB (rounded by the Device Memory API).

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`memory`](DeviceCapabilities.md#memory)

***

### prefersColorScheme

> `readonly` **prefersColorScheme**: `"light"` \| `"dark"`

Defined in: [detect/src/detect.ts:82](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L82)

Effective color scheme (`prefers-color-scheme`).

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`prefersColorScheme`](DeviceCapabilities.md#preferscolorscheme)

***

### prefersContrast

> `readonly` **prefersContrast**: `"no-preference"` \| `"more"` \| `"less"` \| `"custom"`

Defined in: [detect/src/detect.ts:127](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L127)

`prefers-contrast` value.

***

### prefersReducedMotion

> `readonly` **prefersReducedMotion**: `boolean`

Defined in: [detect/src/detect.ts:80](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L80)

`prefers-reduced-motion: reduce` match.

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`prefersReducedMotion`](DeviceCapabilities.md#prefersreducedmotion)

***

### prefersReducedTransparency

> `readonly` **prefersReducedTransparency**: `boolean`

Defined in: [detect/src/detect.ts:131](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L131)

`prefers-reduced-transparency: reduce` match.

***

### touchPrimary

> `readonly` **touchPrimary**: `boolean`

Defined in: [detect/src/detect.ts:78](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L78)

Whether touch is a primary input modality (maxTouchPoints or ontouchstart).

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`touchPrimary`](DeviceCapabilities.md#touchprimary)

***

### updateRate

> `readonly` **updateRate**: `"fast"` \| `"slow"` \| `"none"`

Defined in: [detect/src/detect.ts:137](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L137)

Update rate from `(update: ...)`; `none` = e-ink / print.

***

### viewportHeight

> `readonly` **viewportHeight**: `number`

Defined in: [detect/src/detect.ts:86](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L86)

`window.innerHeight` at detection time.

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`viewportHeight`](DeviceCapabilities.md#viewportheight)

***

### viewportWidth

> `readonly` **viewportWidth**: `number`

Defined in: [detect/src/detect.ts:84](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L84)

`window.innerWidth` at detection time.

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`viewportWidth`](DeviceCapabilities.md#viewportwidth)

***

### webgpu

> `readonly` **webgpu**: `boolean`

Defined in: [detect/src/detect.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L76)

Whether `navigator.gpu` is present (WebGPU available).

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`webgpu`](DeviceCapabilities.md#webgpu)
