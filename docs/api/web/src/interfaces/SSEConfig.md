[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / SSEConfig

# Interface: SSEConfig

Defined in: [web/src/types.ts:217](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L217)

SSE client configuration.

## Properties

### artifactId?

> `readonly` `optional` **artifactId?**: `string`

Defined in: [web/src/types.ts:223](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L223)

Appended to the stream URL as a path segment; also the key the
`Resumption` namespace uses for its `sessionStorage` state.

***

### heartbeatInterval?

> `readonly` `optional` **heartbeatInterval?**: `Millis`

Defined in: [web/src/types.ts:235](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L235)

***

### lastEventId?

> `readonly` `optional` **lastEventId?**: `string`

Defined in: [web/src/types.ts:229](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L229)

Initial cursor re-sent to the server on (re)connect. Seed it from
`Resumption.loadState` on cold start so the stream resumes where
the previous session left off.

***

### reconnect?

> `readonly` `optional` **reconnect?**: `Partial`\<[`ReconnectConfig`](ReconnectConfig.md)\>

Defined in: [web/src/types.ts:234](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L234)

Partial overrides are merged over `defaultReconnectConfig`
(maxAttempts 10, initialDelay 1000ms, maxDelay 30000ms, factor 2).

***

### url

> `readonly` **url**: `string`

Defined in: [web/src/types.ts:218](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L218)
