[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / DetectionResult

# Interface: DetectionResult

Defined in: [detect/src/detect.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L107)

Result of a single detection sweep.

Bundles the probed capabilities together with the derived [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md)
tier, its monotone [CapSet](../../../liteship/src/evidence/interfaces/CapSet.md), and a confidence score reflecting how
many probes returned real values (vs. defaults).

## Extended by

- [`ExtendedDetectionResult`](ExtendedDetectionResult.md)

## Properties

### capabilities

> `readonly` **capabilities**: [`DeviceCapabilities`](DeviceCapabilities.md)

Defined in: [detect/src/detect.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L109)

The probed capabilities.

***

### capSet

> `readonly` **capSet**: [`CapSet`](../../../liteship/src/evidence/interfaces/CapSet.md)

Defined in: [detect/src/detect.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L113)

Monotone set of every [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md) at or below `capTier`.

***

### capTier

> `readonly` **capTier**: [`CapTier`](../../../liteship/src/evidence/type-aliases/CapTier.md)

Defined in: [detect/src/detect.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L111)

Highest [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md) the device qualifies for.

***

### confidence

> `readonly` **confidence**: `number`

Defined in: [detect/src/detect.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L115)

Heuristic confidence in `[0.5, 1]` based on how many probes succeeded.
