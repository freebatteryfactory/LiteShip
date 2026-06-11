[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / ExtendedDetectionResult

# Interface: ExtendedDetectionResult

Defined in: [detect/src/detect.ts:146](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L146)

Full detection result including design and motion tiers.

Returned by [Detect.detect](../variables/Detect.md#detect). Consumers typically destructure
`{ capSet, designTier, motionTier }` and pass them to boundary evaluation
and compiler dispatch.

## Extends

- [`DetectionResult`](DetectionResult.md)

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [detect/src/detect.ts:148](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L148)

Extended capabilities (superset of `DeviceCapabilities`).

#### Overrides

[`DetectionResult`](DetectionResult.md).[`capabilities`](DetectionResult.md#capabilities)

***

### capSet

> `readonly` **capSet**: [`CapSet`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/CapSet.md)

Defined in: [detect/src/detect.ts:112](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L112)

Monotone set of every [CapLevel](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md) at or below `tier`.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`capSet`](DetectionResult.md#capset)

***

### confidence

> `readonly` **confidence**: `number`

Defined in: [detect/src/detect.ts:114](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L114)

Heuristic confidence in `[0.5, 1]` based on how many probes succeeded.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`confidence`](DetectionResult.md#confidence)

***

### designTier

> `readonly` **designTier**: [`DesignTier`](../type-aliases/DesignTier.md)

Defined in: [detect/src/detect.ts:150](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L150)

Visual fidelity tier derived from display metadata.

***

### motionTier

> `readonly` **motionTier**: `MotionTier`

Defined in: [detect/src/detect.ts:152](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L152)

Motion complexity tier derived from GPU, cores, and reduced-motion.

***

### tier

> `readonly` **tier**: [`CapLevel`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md)

Defined in: [detect/src/detect.ts:110](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L110)

Highest [CapLevel](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md) the device qualifies for.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`tier`](DetectionResult.md#tier)
