[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / SSEEventSource

# Interface: SSEEventSource

Defined in: [web/src/stream/sse.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L25)

The EventSource surface the SSE client actually drives (assign, onmessage,
onerror, close). Named so the dependency is structural rather than ambient:
test doubles (tests/helpers/mock-event-source.ts) conform to THIS type, and
drift between consumer and double breaks the build.

## Properties

### onerror

> **onerror**: ((`event`) => `void`) \| `null`

Defined in: [web/src/stream/sse.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L27)

***

### onmessage

> **onmessage**: ((`event`) => `void`) \| `null`

Defined in: [web/src/stream/sse.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L26)

## Methods

### close()

> **close**(): `void`

Defined in: [web/src/stream/sse.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/sse.ts#L28)

#### Returns

`void`
