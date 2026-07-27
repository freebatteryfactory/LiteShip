[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ExtendedDetectionResult

# Interface: ExtendedDetectionResult

Defined in: [\_spine/detect.d.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L83)

Detection result extended with motion and design-tier decisions.

## Extends

- [`DetectionResult`](DetectionResult.md)

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [\_spine/detect.d.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L84)

#### Overrides

[`DetectionResult`](DetectionResult.md).[`capabilities`](DetectionResult.md#capabilities)

***

### capSet

> `readonly` **capSet**: [`CapSet`](CapSet.md)

Defined in: [\_spine/detect.d.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L37)

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`capSet`](DetectionResult.md#capset)

***

### capTier

> `readonly` **capTier**: [`CapTier`](../type-aliases/CapTier.md)

Defined in: [\_spine/detect.d.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L36)

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`capTier`](DetectionResult.md#captier)

***

### confidence

> `readonly` **confidence**: `number`

Defined in: [\_spine/detect.d.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L38)

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`confidence`](DetectionResult.md#confidence)

***

### designTier

> `readonly` **designTier**: [`DesignTier`](../type-aliases/DesignTier.md)

Defined in: [\_spine/detect.d.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L85)

***

### motionTier

> `readonly` **motionTier**: [`MotionTier`](../type-aliases/MotionTier.md)

Defined in: [\_spine/detect.d.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L86)
