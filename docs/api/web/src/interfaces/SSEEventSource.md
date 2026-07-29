[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / SSEEventSource

# Interface: SSEEventSource

Defined in: [web/src/stream/sse.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L34)

The EventSource surface the SSE client actually drives (assign, onmessage,
onerror, close). Named so the dependency is structural rather than ambient:
test doubles (tests/helpers/mock-event-source.ts) conform to THIS type, and
drift between consumer and double breaks the build.

## Properties

### onerror

> **onerror**: ((`event`) => `void`) \| `null`

Defined in: [web/src/stream/sse.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L36)

***

### onmessage

> **onmessage**: ((`event`) => `void`) \| `null`

Defined in: [web/src/stream/sse.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L35)

## Methods

### close()

> **close**(): `void`

Defined in: [web/src/stream/sse.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L37)

#### Returns

`void`
