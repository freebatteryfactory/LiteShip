[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ReconnectConfig

# Interface: ReconnectConfig

Defined in: [web/src/types.ts:285](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L285)

Reconnection configuration. Engine defaults live in
`defaultReconnectConfig` (`./stream/sse-pure.js`); `SSEConfig.reconnect`
accepts a partial and merges over those defaults.

## Properties

### factor

> `readonly` **factor**: `number`

Defined in: [web/src/types.ts:289](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L289)

***

### initialDelay

> `readonly` **initialDelay**: `Millis`

Defined in: [web/src/types.ts:287](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L287)

***

### maxAttempts

> `readonly` **maxAttempts**: `number`

Defined in: [web/src/types.ts:286](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L286)

***

### maxDelay

> `readonly` **maxDelay**: `Millis`

Defined in: [web/src/types.ts:288](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L288)
