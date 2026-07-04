[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / SSEConfig

# Interface: SSEConfig

Defined in: [web/src/types.ts:241](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L241)

SSE client configuration.

## Properties

### artifactId?

> `readonly` `optional` **artifactId?**: `string`

Defined in: [web/src/types.ts:247](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L247)

Appended to the stream URL as a path segment; also the key the
`Resumption` namespace uses for its `sessionStorage` state.

***

### heartbeatInterval?

> `readonly` `optional` **heartbeatInterval?**: `Millis`

Defined in: [web/src/types.ts:259](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L259)

***

### lastEventId?

> `readonly` `optional` **lastEventId?**: `string`

Defined in: [web/src/types.ts:253](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L253)

Initial cursor re-sent to the server on (re)connect. Seed it from
`Resumption.loadState` on cold start so the stream resumes where
the previous session left off.

***

### onMessage?

> `readonly` `optional` **onMessage?**: (`message`) => `void`

Defined in: [web/src/types.ts:276](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L276)

Synchronous message sink. When set, each parsed message is delivered to
this callback *synchronously* inside the `EventSource` `onmessage` handler
(after the mandatory `parseMessage` preflight), and the async `messages`
Stream + overflow buffer are bypassed — a synchronous consumer holds no
buffer, so there is nothing to overflow. Use this when processing must
complete within the dispatch turn (the live morph directives); use
`messages` for buffered async consumption.

#### Parameters

##### message

[`SSEMessage`](../type-aliases/SSEMessage.md)

#### Returns

`void`

***

### onStateChange?

> `readonly` `optional` **onStateChange?**: (`state`) => `void`

Defined in: [web/src/types.ts:282](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L282)

Synchronous state-transition sink — the callback form of `stateChanges`,
fired synchronously as each edge is emitted. Pair with `onMessage` for
fully synchronous directive consumption.

#### Parameters

##### state

[`SSEState`](../type-aliases/SSEState.md)

#### Returns

`void`

***

### overflow?

> `readonly` `optional` **overflow?**: [`OverflowPolicy`](../type-aliases/OverflowPolicy.md)

Defined in: [web/src/types.ts:266](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L266)

Overflow policy applied when the receive buffer saturates. Partial
over the engine default (`coalesce-by-id`, see `defaultOverflowPolicy`
in `./stream/sse-pure.js`) — like `reconnect`, callers override the one
knob without restating the rest.

***

### reconnect?

> `readonly` `optional` **reconnect?**: `Partial`\<[`ReconnectConfig`](ReconnectConfig.md)\>

Defined in: [web/src/types.ts:258](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L258)

Partial overrides are merged over `defaultReconnectConfig`
(maxAttempts 10, initialDelay 1000ms, maxDelay 30000ms, factor 2).

***

### url

> `readonly` **url**: `string`

Defined in: [web/src/types.ts:242](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L242)
