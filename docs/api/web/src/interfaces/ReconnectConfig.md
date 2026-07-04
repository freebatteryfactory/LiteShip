[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ReconnectConfig

# Interface: ReconnectConfig

Defined in: [web/src/types.ts:290](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L290)

Reconnection configuration. Engine defaults live in
`defaultReconnectConfig` (`./stream/sse-pure.js`); `SSEConfig.reconnect`
accepts a partial and merges over those defaults.

## Properties

### factor

> `readonly` **factor**: `number`

Defined in: [web/src/types.ts:294](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L294)

***

### initialDelay

> `readonly` **initialDelay**: `Millis`

Defined in: [web/src/types.ts:292](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L292)

***

### maxAttempts

> `readonly` **maxAttempts**: `number`

Defined in: [web/src/types.ts:291](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L291)

***

### maxDelay

> `readonly` **maxDelay**: `Millis`

Defined in: [web/src/types.ts:293](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L293)
