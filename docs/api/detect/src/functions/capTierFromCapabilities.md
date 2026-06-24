[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / capTierFromCapabilities

# Function: capTierFromCapabilities()

> **capTierFromCapabilities**(`caps`): [`CapTier`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md)

Defined in: [detect/src/tiers.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/tiers.ts#L35)

Determine the highest capability level the device can support based on
its detected hardware and preference characteristics.

Advanced — `detect()` already returns this as `result.capTier`; call this
directly only when you hold a [DeviceCapabilities](../interfaces/DeviceCapabilities.md) that did not come
from a `detect()` sweep (capsule/edge consumers).

## Parameters

### caps

[`DeviceCapabilities`](../interfaces/DeviceCapabilities.md)

## Returns

[`CapTier`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md)
