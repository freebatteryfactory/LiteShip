[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / DetectionResult

# Interface: DetectionResult

Defined in: [detect/src/detect.ts:108](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L108)

Result of a single detection sweep.

Bundles the probed capabilities together with the derived [CapLevel](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md)
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

Monotone set of every [CapLevel](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md) at or below `tier`.

***

### confidence

> `readonly` **confidence**: `number`

Defined in: [detect/src/detect.ts:116](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L116)

Heuristic confidence in `[0.5, 1]` based on how many probes succeeded.

***

### tier

> `readonly` **tier**: [`CapLevel`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md)

Defined in: [detect/src/detect.ts:112](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L112)

Highest [CapLevel](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md) the device qualifies for.
