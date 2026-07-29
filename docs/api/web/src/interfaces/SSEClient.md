[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / SSEClient

# Interface: SSEClient

Defined in: [web/src/stream/sse.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L43)

SSE client instance.

## Extends

- [`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md)

## Properties

### backpressure

> `readonly` **backpressure**: [`BackpressureHint`](BackpressureHint.md)

Defined in: [web/src/stream/sse.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L64)

Backpressure snapshot for the current buffer occupancy (plain accessor).

***

### lastEventId

> `readonly` **lastEventId**: `string` \| `null`

Defined in: [web/src/stream/sse.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L62)

Cursor from the most recent message, or `null` (plain accessor).

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../../../liteship/src/reactive/type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`lifetime`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#lifetime)

***

### messages

> `readonly` **messages**: `AsyncIterable`\<[`SSEMessage`](../type-aliases/SSEMessage.md)\>

Defined in: [web/src/stream/sse.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L50)

Live async stream of parsed messages. Iterating drains the sse-pure
overflow buffer (so [backpressure](#backpressure) `bufferSize` drops as messages are
consumed); competing iterators share the single buffer, matching the former
bounded-`Queue` semantics.

***

### state

> `readonly` **state**: [`SSEState`](../type-aliases/SSEState.md)

Defined in: [web/src/stream/sse.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L60)

Current connection state (plain accessor).

***

### stateChanges

> `readonly` **stateChanges**: `AsyncIterable`\<[`SSEState`](../type-aliases/SSEState.md)\>

Defined in: [web/src/stream/sse.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L58)

Edge stream of connection-state *transitions* (one emission per
`connecting`/`reconnecting`/`connected`/`error`/`disconnected` change,
deduplicated). Directive bridges drive resumption off the
`reconnecting -> connected` edge — `state` is the pull accessor,
`stateChanges` is the push edge.

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:112

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`[asyncDispose]`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#asyncdispose)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:110

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`dispose`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#dispose)

***

### reconnect()

> **reconnect**(): `void`

Defined in: [web/src/stream/sse.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L66)

Manual reconnect: cancel timers, close the source, reset backoff, re-open.

#### Returns

`void`
