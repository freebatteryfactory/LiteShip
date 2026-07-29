[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / ExtendedDetectionResult

# Interface: ExtendedDetectionResult

Defined in: [\_spine/detect.d.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L150)

Detection result extended with motion and design-tier decisions.

## Extends

- [`DetectionResult`](DetectionResult.md)

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [\_spine/detect.d.ts:151](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L151)

#### Overrides

[`DetectionResult`](DetectionResult.md).[`capabilities`](DetectionResult.md#capabilities)

***

### capSet

> `readonly` **capSet**: [`CapSet`](CapSet.md)

Defined in: [\_spine/detect.d.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L93)

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`capSet`](DetectionResult.md#capset)

***

### capTier

> `readonly` **capTier**: [`CapTier`](../type-aliases/CapTier.md)

Defined in: [\_spine/detect.d.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L92)

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`capTier`](DetectionResult.md#captier)

***

### designTier

> `readonly` **designTier**: [`DesignTier`](../type-aliases/DesignTier.md)

Defined in: [\_spine/detect.d.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L152)

***

### motionTier

> `readonly` **motionTier**: [`MotionTier`](../type-aliases/MotionTier.md)

Defined in: [\_spine/detect.d.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L153)

***

### tierEvidence

> `readonly` **tierEvidence**: [`CapabilityTierEvidence`](../type-aliases/CapabilityTierEvidence.md)

Defined in: [\_spine/detect.d.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/detect.d.ts#L94)

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`tierEvidence`](DetectionResult.md#tierevidence)
