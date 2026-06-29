[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / SSEConfig

# Interface: SSEConfig

Defined in: [web/src/types.ts:216](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L216)

SSE client configuration.

## Properties

### artifactId?

> `readonly` `optional` **artifactId?**: `string`

Defined in: [web/src/types.ts:222](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L222)

Appended to the stream URL as a path segment; also the key the
`Resumption` namespace uses for its `sessionStorage` state.

***

### heartbeatInterval?

> `readonly` `optional` **heartbeatInterval?**: `Millis`

Defined in: [web/src/types.ts:234](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L234)

***

### lastEventId?

> `readonly` `optional` **lastEventId?**: `string`

Defined in: [web/src/types.ts:228](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L228)

Initial cursor re-sent to the server on (re)connect. Seed it from
`Resumption.loadState` on cold start so the stream resumes where
the previous session left off.

***

### reconnect?

> `readonly` `optional` **reconnect?**: `Partial`\<[`ReconnectConfig`](ReconnectConfig.md)\>

Defined in: [web/src/types.ts:233](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L233)

Partial overrides are merged over `defaultReconnectConfig`
(maxAttempts 10, initialDelay 1000ms, maxDelay 30000ms, factor 2).

***

### url

> `readonly` **url**: `string`

Defined in: [web/src/types.ts:217](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L217)
