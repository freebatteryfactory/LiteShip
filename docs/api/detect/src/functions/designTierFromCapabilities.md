[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / designTierFromCapabilities

# Function: designTierFromCapabilities()

> **designTierFromCapabilities**(`caps`): [`DesignTier`](../type-aliases/DesignTier.md)

Defined in: [detect/src/tiers.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/tiers.ts#L81)

Map extended device capabilities to a design fidelity tier.
Forced colors / no-update screens get minimal; wide-gamut / HDR screens
get rich; standard otherwise with an enhanced middle ground.

Advanced — `detect()` already returns this as `result.designTier`; call
this directly only when you hold an [ExtendedDeviceCapabilities](../interfaces/ExtendedDeviceCapabilities.md)
that did not come from a `detect()` sweep (capsule/edge consumers).

## Parameters

### caps

[`ExtendedDeviceCapabilities`](../interfaces/ExtendedDeviceCapabilities.md)

## Returns

[`DesignTier`](../type-aliases/DesignTier.md)
