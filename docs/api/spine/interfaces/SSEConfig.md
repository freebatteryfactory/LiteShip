[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SSEConfig

# Interface: SSEConfig

Defined in: [\_spine/web.d.ts:224](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L224)

Endpoint, retry, heartbeat, and queue options for an SSE client.

## Properties

### artifactId?

> `readonly` `optional` **artifactId?**: `string`

Defined in: [\_spine/web.d.ts:226](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L226)

***

### heartbeatInterval?

> `readonly` `optional` **heartbeatInterval?**: `number`

Defined in: [\_spine/web.d.ts:233](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L233)

***

### lastEventId?

> `readonly` `optional` **lastEventId?**: `string`

Defined in: [\_spine/web.d.ts:227](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L227)

***

### onMessage?

> `readonly` `optional` **onMessage?**: (`message`) => `void`

Defined in: [\_spine/web.d.ts:242](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L242)

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

Defined in: [\_spine/web.d.ts:244](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L244)

Synchronous state-transition sink — the callback form of `stateChanges`.

#### Parameters

##### state

[`SSEState`](../type-aliases/SSEState.md)

#### Returns

`void`

***

### overflow?

> `readonly` `optional` **overflow?**: [`OverflowPolicy`](../type-aliases/OverflowPolicy.md)

Defined in: [\_spine/web.d.ts:235](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L235)

Overflow policy applied when the receive buffer saturates (default `coalesce-by-id`).

***

### reconnect?

> `readonly` `optional` **reconnect?**: `Partial`\<[`ReconnectConfig`](ReconnectConfig.md)\>

Defined in: [\_spine/web.d.ts:232](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L232)

Partial overrides are merged over `defaultReconnectConfig`
(maxAttempts 10, initialDelay 1000ms, maxDelay 30000ms, factor 2).

***

### url

> `readonly` **url**: `string`

Defined in: [\_spine/web.d.ts:225](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L225)
