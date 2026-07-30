[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / ReconnectConfig

# Interface: ReconnectConfig

Defined in: [web/src/types.ts:283](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L283)

Reconnection configuration. Engine defaults live in
`defaultReconnectConfig` (`./stream/sse-pure.js`); `SSEConfig.reconnect`
accepts a partial and merges over those defaults.

## Properties

### factor

> `readonly` **factor**: `number`

Defined in: [web/src/types.ts:287](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L287)

***

### initialDelay

> `readonly` **initialDelay**: [`Millis`](../../../spine/type-aliases/Millis.md)

Defined in: [web/src/types.ts:285](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L285)

***

### maxAttempts

> `readonly` **maxAttempts**: `number`

Defined in: [web/src/types.ts:284](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L284)

***

### maxDelay

> `readonly` **maxDelay**: [`Millis`](../../../spine/type-aliases/Millis.md)

Defined in: [web/src/types.ts:286](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L286)
