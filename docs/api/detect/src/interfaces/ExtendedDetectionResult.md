[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / ExtendedDetectionResult

# Interface: ExtendedDetectionResult

Defined in: [detect/src/detect.ts:147](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L147)

Full detection result including design and motion tiers.

Returned by [Detect.detect](../variables/Detect.md#detect). Consumers typically destructure
`{ capSet, designTier, motionTier }` and pass them to boundary evaluation
and compiler dispatch.

## Extends

- [`DetectionResult`](DetectionResult.md)

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [detect/src/detect.ts:149](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L149)

Extended capabilities (superset of `DeviceCapabilities`).

#### Overrides

[`DetectionResult`](DetectionResult.md).[`capabilities`](DetectionResult.md#capabilities)

***

### capSet

> `readonly` **capSet**: [`CapSet`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/CapSet.md)

Defined in: [detect/src/detect.ts:113](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L113)

Monotone set of every [CapLevel](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md) at or below `tier`.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`capSet`](DetectionResult.md#capset)

***

### confidence

> `readonly` **confidence**: `number`

Defined in: [detect/src/detect.ts:115](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L115)

Heuristic confidence in `[0.5, 1]` based on how many probes succeeded.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`confidence`](DetectionResult.md#confidence)

***

### designTier

> `readonly` **designTier**: [`DesignTier`](../type-aliases/DesignTier.md)

Defined in: [detect/src/detect.ts:151](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L151)

Visual fidelity tier derived from display metadata.

***

### motionTier

> `readonly` **motionTier**: `MotionTier`

Defined in: [detect/src/detect.ts:153](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L153)

Motion complexity tier derived from GPU, cores, and reduced-motion.

***

### tier

> `readonly` **tier**: [`CapLevel`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md)

Defined in: [detect/src/detect.ts:111](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L111)

Highest [CapLevel](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md) the device qualifies for.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`tier`](DetectionResult.md#tier)
