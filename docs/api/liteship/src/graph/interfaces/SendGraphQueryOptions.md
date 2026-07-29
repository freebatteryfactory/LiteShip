[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / SendGraphQueryOptions

# Interface: SendGraphQueryOptions

Defined in: core/dist/graph/graph-query.d.ts:81

Options for the retrying QUERY read sender.

## Properties

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: core/dist/graph/graph-query.d.ts:83

Injectable fetch for tests / non-browser hosts. Defaults to global `fetch`.

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`RequestInfo` \| `URL`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`string` \| `Request` \| `URL`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

***

### ifNoneMatch?

> `readonly` `optional` **ifNoneMatch?**: `string`

Defined in: core/dist/graph/graph-query.d.ts:85

Conditional validator — sha256 integrity_digest only.

***

### maxRetries?

> `readonly` `optional` **maxRetries?**: `number`

Defined in: core/dist/graph/graph-query.d.ts:87

Bounded retries on transport / server `error` outcomes (reads are idempotent). Default: 2.

***

### retryDelayMs?

> `readonly` `optional` **retryDelayMs?**: `number`

Defined in: core/dist/graph/graph-query.d.ts:92

Base delay between retry attempts in ms (doubles each attempt — 150, 300,
600, …). Default: 150. Pass 0 for immediate retries (tests).
