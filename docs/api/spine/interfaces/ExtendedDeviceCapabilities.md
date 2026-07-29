[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / ExtendedDeviceCapabilities

# Interface: ExtendedDeviceCapabilities

Defined in: [\_spine/detect.d.ts:140](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L140)

Optional browser capabilities used by richer host decisions.

## Extends

- [`DeviceCapabilities`](DeviceCapabilities.md)

## Properties

### colorGamut

> `readonly` **colorGamut**: `"srgb"` \| `"p3"` \| `"rec2020"`

Defined in: [\_spine/detect.d.ts:145](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L145)

***

### connection?

> `readonly` `optional` **connection?**: `object`

Defined in: [\_spine/detect.d.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L26)

#### downlink

> `readonly` **downlink**: `number`

#### effectiveType

> `readonly` **effectiveType**: `string`

#### saveData

> `readonly` **saveData**: `boolean`

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`connection`](DeviceCapabilities.md#connection)

***

### cores

> `readonly` **cores**: `number`

Defined in: [\_spine/detect.d.ts:17](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L17)

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`cores`](DeviceCapabilities.md#cores)

***

### devicePixelRatio

> `readonly` **devicePixelRatio**: `number`

Defined in: [\_spine/detect.d.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L25)

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`devicePixelRatio`](DeviceCapabilities.md#devicepixelratio)

***

### dynamicRange

> `readonly` **dynamicRange**: `"high"` \| `"standard"`

Defined in: [\_spine/detect.d.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L144)

***

### forcedColors

> `readonly` **forcedColors**: `boolean`

Defined in: [\_spine/detect.d.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L142)

***

### gpu

> `readonly` **gpu**: [`GPUTier`](../type-aliases/GPUTier.md)

Defined in: [\_spine/detect.d.ts:16](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L16)

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`gpu`](DeviceCapabilities.md#gpu)

***

### memory

> `readonly` **memory**: `number`

Defined in: [\_spine/detect.d.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L18)

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`memory`](DeviceCapabilities.md#memory)

***

### prefersColorScheme

> `readonly` **prefersColorScheme**: `"light"` \| `"dark"`

Defined in: [\_spine/detect.d.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L22)

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`prefersColorScheme`](DeviceCapabilities.md#preferscolorscheme)

***

### prefersContrast

> `readonly` **prefersContrast**: `"custom"` \| `"no-preference"` \| `"more"` \| `"less"`

Defined in: [\_spine/detect.d.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L141)

***

### prefersReducedMotion

> `readonly` **prefersReducedMotion**: `boolean`

Defined in: [\_spine/detect.d.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L21)

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`prefersReducedMotion`](DeviceCapabilities.md#prefersreducedmotion)

***

### prefersReducedTransparency

> `readonly` **prefersReducedTransparency**: `boolean`

Defined in: [\_spine/detect.d.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L143)

***

### touchPrimary

> `readonly` **touchPrimary**: `boolean`

Defined in: [\_spine/detect.d.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L20)

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`touchPrimary`](DeviceCapabilities.md#touchprimary)

***

### updateRate

> `readonly` **updateRate**: `"none"` \| `"fast"` \| `"slow"`

Defined in: [\_spine/detect.d.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L146)

***

### viewportHeight

> `readonly` **viewportHeight**: `number`

Defined in: [\_spine/detect.d.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L24)

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`viewportHeight`](DeviceCapabilities.md#viewportheight)

***

### viewportWidth

> `readonly` **viewportWidth**: `number`

Defined in: [\_spine/detect.d.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L23)

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`viewportWidth`](DeviceCapabilities.md#viewportwidth)

***

### webgpu

> `readonly` **webgpu**: `boolean`

Defined in: [\_spine/detect.d.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L19)

#### Inherited from

[`DeviceCapabilities`](DeviceCapabilities.md).[`webgpu`](DeviceCapabilities.md#webgpu)
