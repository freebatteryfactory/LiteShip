[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / SSEClient

# Interface: SSEClient

Defined in: [web/src/stream/sse.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L33)

SSE client instance.

## Properties

### backpressure

> `readonly` **backpressure**: `Effect`\<[`BackpressureHint`](BackpressureHint.md)\>

Defined in: [web/src/stream/sse.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L47)

***

### lastEventId

> `readonly` **lastEventId**: `Effect`\<`string` \| `null`\>

Defined in: [web/src/stream/sse.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L46)

***

### messages

> `readonly` **messages**: `Stream`\<[`SSEMessage`](../type-aliases/SSEMessage.md)\>

Defined in: [web/src/stream/sse.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L34)

***

### state

> `readonly` **state**: `Effect`\<[`SSEState`](../type-aliases/SSEState.md)\>

Defined in: [web/src/stream/sse.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L35)

***

### stateChanges

> `readonly` **stateChanges**: `Stream`\<[`SSEState`](../type-aliases/SSEState.md)\>

Defined in: [web/src/stream/sse.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L43)

Edge stream of connection-state *transitions* (one emission per
`connecting`/`reconnecting`/`connected`/`error`/`disconnected` change,
deduplicated). Directive bridges drive resumption off the
`reconnecting -> connected` edge — `state` is the pull accessor,
`stateChanges` is the push edge.

## Methods

### close()

> **close**(): `Effect`\<`void`\>

Defined in: [web/src/stream/sse.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L44)

#### Returns

`Effect`\<`void`\>

***

### reconnect()

> **reconnect**(): `Effect`\<`void`\>

Defined in: [web/src/stream/sse.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L45)

#### Returns

`Effect`\<`void`\>
