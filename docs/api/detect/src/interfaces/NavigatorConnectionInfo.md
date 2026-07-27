[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / NavigatorConnectionInfo

# Interface: NavigatorConnectionInfo

Defined in: [detect/src/detect.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L39)

The structural shape the connection probe reads off `navigator.connection`.
Exported so test doubles (tests/helpers/mock-browser.ts) conform to the
SAME shape the probe consumes — probe/double drift breaks the build.
Forward-declared here; the probe lives below alongside its alias.

## Properties

### downlink

> `readonly` **downlink**: `number`

Defined in: [detect/src/detect.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L41)

***

### effectiveType

> `readonly` **effectiveType**: `string`

Defined in: [detect/src/detect.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L40)

***

### saveData

> `readonly` **saveData**: `boolean`

Defined in: [detect/src/detect.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L42)
