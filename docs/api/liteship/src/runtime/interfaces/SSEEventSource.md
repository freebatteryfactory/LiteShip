[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / SSEEventSource

# Interface: SSEEventSource

Defined in: web/dist/stream/sse.d.ts:23

The EventSource surface the SSE client actually drives (assign, onmessage,
onerror, close). Named so the dependency is structural rather than ambient:
test doubles (tests/helpers/mock-event-source.ts) conform to THIS type, and
drift between consumer and double breaks the build.

## Properties

### onerror

> **onerror**: ((`event`) => `void`) \| `null`

Defined in: web/dist/stream/sse.d.ts:25

***

### onmessage

> **onmessage**: ((`event`) => `void`) \| `null`

Defined in: web/dist/stream/sse.d.ts:24

## Methods

### close()

> **close**(): `void`

Defined in: web/dist/stream/sse.d.ts:26

#### Returns

`void`
