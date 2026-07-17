[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / SSEClient

# Interface: SSEClient

Defined in: [web/src/stream/sse.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L34)

SSE client instance.

## Properties

### backpressure

> `readonly` **backpressure**: [`BackpressureHint`](BackpressureHint.md)

Defined in: [web/src/stream/sse.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L55)

Backpressure snapshot for the current buffer occupancy (plain accessor).

***

### lastEventId

> `readonly` **lastEventId**: `string` \| `null`

Defined in: [web/src/stream/sse.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L53)

Cursor from the most recent message, or `null` (plain accessor).

***

### messages

> `readonly` **messages**: `AsyncIterable`\<[`SSEMessage`](../type-aliases/SSEMessage.md)\>

Defined in: [web/src/stream/sse.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L41)

Live async stream of parsed messages. Iterating drains the sse-pure
overflow buffer (so [backpressure](#backpressure) `bufferSize` drops as messages are
consumed); competing iterators share the single buffer, matching the former
bounded-`Queue` semantics.

***

### state

> `readonly` **state**: [`SSEState`](../type-aliases/SSEState.md)

Defined in: [web/src/stream/sse.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L51)

Current connection state (plain accessor).

***

### stateChanges

> `readonly` **stateChanges**: `AsyncIterable`\<[`SSEState`](../type-aliases/SSEState.md)\>

Defined in: [web/src/stream/sse.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L49)

Edge stream of connection-state *transitions* (one emission per
`connecting`/`reconnecting`/`connected`/`error`/`disconnected` change,
deduplicated). Directive bridges drive resumption off the
`reconnecting -> connected` edge — `state` is the pull accessor,
`stateChanges` is the push edge.

## Methods

### close()

> **close**(): `void`

Defined in: [web/src/stream/sse.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L61)

Synchronous teardown: cancel the reconnect/heartbeat timers, detach and
close the live EventSource, drop the buffer, and complete the
`messages`/`stateChanges` streams. Idempotent — a second call is a no-op.

#### Returns

`void`

***

### reconnect()

> **reconnect**(): `void`

Defined in: [web/src/stream/sse.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L63)

Manual reconnect: cancel timers, close the source, reset backoff, re-open.

#### Returns

`void`
