[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / capSetFromCapabilities

# Function: capSetFromCapabilities()

> **capSetFromCapabilities**(`caps`): [`CapSet`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/CapSet.md)

Defined in: [detect/src/tiers.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/tiers.ts#L47)

Build a CapSet containing all levels the device qualifies for.
A device at level X automatically has all levels below it.

Advanced — `detect()` already returns this as `result.capSet`; call this
directly only when you hold a [DeviceCapabilities](../interfaces/DeviceCapabilities.md) that did not come
from a `detect()` sweep (capsule/edge consumers).

## Parameters

### caps

[`DeviceCapabilities`](../interfaces/DeviceCapabilities.md)

## Returns

[`CapSet`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/CapSet.md)
