[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SSEConfig

# Interface: SSEConfig

Defined in: [\_spine/web.d.ts:246](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L246)

Endpoint, retry, heartbeat, and queue options for an SSE client.

## Properties

### artifactId?

> `readonly` `optional` **artifactId?**: `string`

Defined in: [\_spine/web.d.ts:248](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L248)

***

### heartbeatInterval?

> `readonly` `optional` **heartbeatInterval?**: [`Millis`](../type-aliases/Millis.md)

Defined in: [\_spine/web.d.ts:255](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L255)

***

### lastEventId?

> `readonly` `optional` **lastEventId?**: `string`

Defined in: [\_spine/web.d.ts:249](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L249)

***

### onMessage?

> `readonly` `optional` **onMessage?**: (`message`) => `void`

Defined in: [\_spine/web.d.ts:264](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L264)

Synchronous message sink. When set, each parsed message is delivered to this
callback inside `onmessage` (after the `parseMessage` preflight) and the async
`messages` Stream + overflow buffer are bypassed — a synchronous consumer
holds no buffer. Use for in-dispatch-turn processing (the live directives).

#### Parameters

##### message

[`SSEMessage`](../type-aliases/SSEMessage.md)

#### Returns

`void`

***

### onStateChange?

> `readonly` `optional` **onStateChange?**: (`state`) => `void`

Defined in: [\_spine/web.d.ts:266](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L266)

Synchronous state-transition sink — the callback form of `stateChanges`.

#### Parameters

##### state

[`SSEState`](../type-aliases/SSEState.md)

#### Returns

`void`

***

### overflow?

> `readonly` `optional` **overflow?**: [`OverflowPolicy`](../type-aliases/OverflowPolicy.md)

Defined in: [\_spine/web.d.ts:257](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L257)

Overflow policy applied when the receive buffer saturates (default `coalesce-by-id`).

***

### reconnect?

> `readonly` `optional` **reconnect?**: `Partial`\<[`ReconnectConfig`](ReconnectConfig.md)\>

Defined in: [\_spine/web.d.ts:254](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L254)

Partial overrides are merged over `defaultReconnectConfig`
(maxAttempts 10, initialDelay 1000ms, maxDelay 30000ms, factor 2).

***

### url

> `readonly` **url**: `string`

Defined in: [\_spine/web.d.ts:247](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L247)
