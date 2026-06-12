[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / motionTierFromCapabilities

# Function: motionTierFromCapabilities()

> **motionTierFromCapabilities**(`caps`): `MotionTier`

Defined in: [detect/src/tiers.ts:116](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/tiers.ts#L116)

Map extended device capabilities to a motion complexity tier.
Reduced-motion &rarr; `none`; GPU tier and core count gate the upper levels;
WebGPU availability unlocks the `compute` tier.

Advanced — `detect()` already returns this as `result.motionTier`; call
this directly only when you hold an [ExtendedDeviceCapabilities](../interfaces/ExtendedDeviceCapabilities.md)
that did not come from a `detect()` sweep (capsule/edge consumers).

## Parameters

### caps

[`ExtendedDeviceCapabilities`](../interfaces/ExtendedDeviceCapabilities.md)

## Returns

`MotionTier`
