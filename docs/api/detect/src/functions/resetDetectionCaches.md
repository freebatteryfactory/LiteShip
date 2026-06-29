[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / resetDetectionCaches

# Function: resetDetectionCaches()

> **resetDetectionCaches**(): `void`

Defined in: [detect/src/detect.ts:300](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L300)

Clear memoized session-stable probe results (currently the GPU renderer
string). The GPU cannot change while a page lives, so production code never
needs this — it exists for test isolation, mirroring `Diagnostics.reset`.

## Returns

`void`
