[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / ExtendedDetectionResult

# Interface: ExtendedDetectionResult

Defined in: [detect/src/detect.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L148)

Full detection result including design and motion tiers.

Returned by [Detect.detect](../variables/Detect.md#detect). Consumers typically destructure
`{ capSet, designTier, motionTier }` and pass them to boundary evaluation
and compiler dispatch.

## Extends

- [`DetectionResult`](DetectionResult.md)

## Properties

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [detect/src/detect.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L150)

Extended capabilities (superset of `DeviceCapabilities`).

#### Overrides

[`DetectionResult`](DetectionResult.md).[`capabilities`](DetectionResult.md#capabilities)

***

### capSet

> `readonly` **capSet**: [`CapSet`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/CapSet.md)

Defined in: [detect/src/detect.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L114)

Monotone set of every [CapTier](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md) at or below `capTier`.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`capSet`](DetectionResult.md#capset)

***

### capTier

> `readonly` **capTier**: [`CapTier`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md)

Defined in: [detect/src/detect.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L112)

Highest [CapTier](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md) the device qualifies for.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`capTier`](DetectionResult.md#captier)

***

### confidence

> `readonly` **confidence**: `number`

Defined in: [detect/src/detect.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L116)

Heuristic confidence in `[0.5, 1]` based on how many probes succeeded.

#### Inherited from

[`DetectionResult`](DetectionResult.md).[`confidence`](DetectionResult.md#confidence)

***

### designTier

> `readonly` **designTier**: [`DesignTier`](../type-aliases/DesignTier.md)

Defined in: [detect/src/detect.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L152)

Visual fidelity tier derived from display metadata.

***

### motionTier

> `readonly` **motionTier**: `MotionTier`

Defined in: [detect/src/detect.ts:154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L154)

Motion complexity tier derived from GPU, cores, and reduced-motion.
