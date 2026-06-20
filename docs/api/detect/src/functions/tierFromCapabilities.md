[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / tierFromCapabilities

# Function: tierFromCapabilities()

> **tierFromCapabilities**(`caps`): [`CapLevel`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md)

Defined in: [detect/src/tiers.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/tiers.ts#L35)

Determine the highest capability level the device can support based on
its detected hardware and preference characteristics.

Advanced — `detect()` already returns this as `result.tier`; call this
directly only when you hold a [DeviceCapabilities](../interfaces/DeviceCapabilities.md) that did not come
from a `detect()` sweep (capsule/edge consumers).

## Parameters

### caps

[`DeviceCapabilities`](../interfaces/DeviceCapabilities.md)

## Returns

[`CapLevel`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md)
