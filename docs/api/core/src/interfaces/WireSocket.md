[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / WireSocket

# Interface: WireSocket

Defined in: [core/src/wire.ts:143](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/wire.ts#L143)

The WebSocket surface [Wire.fromWebSocket](../variables/Wire.md#fromwebsocket) actually drives. Named so
the dependency is structural rather than ambient: test doubles
(tests/helpers/mock-websocket.ts) conform to THIS type, and any drift
between what the Wire consumes and what the double provides breaks the
build instead of silently diverging.

## Properties

### onclose

> **onclose**: ((`event`) => `void`) \| `null`

Defined in: [core/src/wire.ts:146](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/wire.ts#L146)

***

### onerror

> **onerror**: ((`event`) => `void`) \| `null`

Defined in: [core/src/wire.ts:145](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/wire.ts#L145)

***

### onmessage

> **onmessage**: ((`event`) => `void`) \| `null`

Defined in: [core/src/wire.ts:144](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/wire.ts#L144)

***

### readyState

> `readonly` **readyState**: `number`

Defined in: [core/src/wire.ts:147](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/wire.ts#L147)

## Methods

### close()

> **close**(): `void`

Defined in: [core/src/wire.ts:148](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/wire.ts#L148)

#### Returns

`void`
