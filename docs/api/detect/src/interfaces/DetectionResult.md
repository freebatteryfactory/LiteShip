[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [detect/src](../README.md) / DetectionResult

# Interface: DetectionResult

Defined in: [detect/src/detect.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L114)

Result of a single detection sweep.

Bundles the probed capabilities together with the derived [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md)
tier, its monotone [CapSet](../../../liteship/src/evidence/interfaces/CapSet.md), and per-axis evidence that distinguishes
observed inputs from conservative fallbacks.

## Extended by

- [`ExtendedDetectionResult`](ExtendedDetectionResult.md)

## Properties

### capabilities

> `readonly` **capabilities**: [`DeviceCapabilities`](DeviceCapabilities.md)

Defined in: [detect/src/detect.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L116)

The probed capabilities.

***

### capSet

> `readonly` **capSet**: [`CapSet`](../../../liteship/src/evidence/interfaces/CapSet.md)

Defined in: [detect/src/detect.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L120)

Monotone set of every [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md) at or below `capTier`.

***

### capTier

> `readonly` **capTier**: [`CapTier`](../../../liteship/src/evidence/type-aliases/CapTier.md)

Defined in: [detect/src/detect.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L118)

Highest [CapTier](../../../liteship/src/evidence/type-aliases/CapTier.md) the device qualifies for.

***

### tierEvidence

> `readonly` **tierEvidence**: [`CapabilityTierEvidence`](../type-aliases/CapabilityTierEvidence.md)

Defined in: [detect/src/detect.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L122)

Per-axis provenance for the complete tier values.
