[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / SSEConfig

# Interface: SSEConfig

Defined in: [web/src/types.ts:202](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L202)

SSE client configuration.

## Properties

### artifactId?

> `readonly` `optional` **artifactId?**: `string`

Defined in: [web/src/types.ts:208](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L208)

Appended to the stream URL as a path segment; also the key the
`Resumption` namespace uses for its `sessionStorage` state.

***

### heartbeatInterval?

> `readonly` `optional` **heartbeatInterval?**: `Millis`

Defined in: [web/src/types.ts:216](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L216)

***

### lastEventId?

> `readonly` `optional` **lastEventId?**: `string`

Defined in: [web/src/types.ts:214](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L214)

Initial cursor re-sent to the server on (re)connect. Seed it from
`Resumption.loadState` on cold start so the stream resumes where
the previous session left off.

***

### reconnect?

> `readonly` `optional` **reconnect?**: [`ReconnectConfig`](ReconnectConfig.md)

Defined in: [web/src/types.ts:215](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L215)

***

### url

> `readonly` **url**: `string`

Defined in: [web/src/types.ts:203](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L203)
