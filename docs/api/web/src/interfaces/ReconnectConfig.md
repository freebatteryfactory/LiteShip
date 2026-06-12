[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ReconnectConfig

# Interface: ReconnectConfig

Defined in: [web/src/types.ts:243](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L243)

Reconnection configuration. Engine defaults live in
`defaultReconnectConfig` (`./stream/sse-pure.js`); `SSEConfig.reconnect`
accepts a partial and merges over those defaults.

## Properties

### factor

> `readonly` **factor**: `number`

Defined in: [web/src/types.ts:247](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L247)

***

### initialDelay

> `readonly` **initialDelay**: `Millis`

Defined in: [web/src/types.ts:245](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L245)

***

### maxAttempts

> `readonly` **maxAttempts**: `number`

Defined in: [web/src/types.ts:244](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L244)

***

### maxDelay

> `readonly` **maxDelay**: `Millis`

Defined in: [web/src/types.ts:246](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L246)
