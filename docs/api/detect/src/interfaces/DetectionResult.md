[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / DetectionResult

# Interface: DetectionResult

Defined in: [detect/src/detect.ts:108](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L108)

Result of a single detection sweep.

Bundles the probed capabilities together with the derived CapTier
tier, its monotone [CapSet](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/CapSet.md), and a confidence score reflecting how
many probes returned real values (vs. defaults).

## Extended by

- [`ExtendedDetectionResult`](ExtendedDetectionResult.md)

## Properties

### capabilities

> `readonly` **capabilities**: [`DeviceCapabilities`](DeviceCapabilities.md)

Defined in: [detect/src/detect.ts:110](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L110)

The probed capabilities.

***

### capSet

> `readonly` **capSet**: [`CapSet`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/CapSet.md)

Defined in: [detect/src/detect.ts:114](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L114)

Monotone set of every CapTier at or below `capTier`.

***

### capTier

> `readonly` **capTier**: `CapTier`

Defined in: [detect/src/detect.ts:112](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L112)

Highest CapTier the device qualifies for.

***

### confidence

> `readonly` **confidence**: `number`

Defined in: [detect/src/detect.ts:116](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L116)

Heuristic confidence in `[0.5, 1]` based on how many probes succeeded.
