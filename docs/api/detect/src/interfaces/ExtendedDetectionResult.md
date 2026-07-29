[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [detect/src](../README.md) / ExtendedDetectionResult

# Interface: ExtendedDetectionResult

Defined in: [detect/src/detect.ts:154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L154)

Full detection result including design and motion tiers.

Returned by [Detect.detect](../variables/Detect.md#detect). Consumers typically destructure
`{ capSet, designTier, motionTier }` and pass them to boundary evaluation
and compiler dispatch.

## Extends

- [`DetectionResult`](DetectionResult.md)

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [detect/src/detect.ts:156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L156)

Extended capabilities (superset of `DeviceCapabilities`).

#### Overrides

[`DetectionResult`](DetectionResult.md).[`capabilities`](DetectionResult.md#capabilities)

***

### capSet

> `readonly` **capSet**: [`CapSet`](../../../liteship/src/evidence/interfaces/CapSet.md)

Defined in: [detect/src/detect.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L120)

Monotone set of every [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md) at or below `capTier`.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`capSet`](DetectionResult.md#capset)

***

### capTier

> `readonly` **capTier**: [`CapTier`](../../../liteship/src/evidence/type-aliases/CapTier.md)

Defined in: [detect/src/detect.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L118)

Highest [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md) the device qualifies for.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`capTier`](DetectionResult.md#captier)

***

### designTier

> `readonly` **designTier**: [`DesignTier`](../type-aliases/DesignTier.md)

Defined in: [detect/src/detect.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L158)

Visual fidelity tier derived from display metadata.

***

### motionTier

> `readonly` **motionTier**: [`MotionTier`](../../../spine/type-aliases/MotionTier.md)

Defined in: [detect/src/detect.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L160)

Motion complexity tier derived from GPU, cores, and reduced-motion.

***

### tierEvidence

> `readonly` **tierEvidence**: [`CapabilityTierEvidence`](../type-aliases/CapabilityTierEvidence.md)

Defined in: [detect/src/detect.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L122)

Per-axis provenance for the complete tier values.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`tierEvidence`](DetectionResult.md#tierevidence)
