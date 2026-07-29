[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / ReconnectConfig

# Interface: ReconnectConfig

Defined in: web/dist/types.d.ts:253

Reconnection configuration. Engine defaults live in
`defaultReconnectConfig` (`./stream/sse-pure.js`); `SSEConfig.reconnect`
accepts a partial and merges over those defaults.

## Properties

### factor

> `readonly` **factor**: `number`

Defined in: web/dist/types.d.ts:257

***

### initialDelay

> `readonly` **initialDelay**: [`Millis`](../../../../spine/type-aliases/Millis.md)

Defined in: web/dist/types.d.ts:255

***

### maxAttempts

> `readonly` **maxAttempts**: `number`

Defined in: web/dist/types.d.ts:254

***

### maxDelay

> `readonly` **maxDelay**: [`Millis`](../../../../spine/type-aliases/Millis.md)

Defined in: web/dist/types.d.ts:256
