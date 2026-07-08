[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / SendGraphQueryOptions

# Interface: SendGraphQueryOptions

Defined in: [core/src/graph-query.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L146)

Options for the retrying QUERY read sender.

## Properties

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: [core/src/graph-query.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L148)

Injectable fetch for tests / non-browser hosts. Defaults to global `fetch`.

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`URL` \| `RequestInfo`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`string` \| `URL` \| `Request`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

***

### ifNoneMatch?

> `readonly` `optional` **ifNoneMatch?**: `string`

Defined in: [core/src/graph-query.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L150)

Conditional validator — sha256 integrity_digest only.

***

### maxRetries?

> `readonly` `optional` **maxRetries?**: `number`

Defined in: [core/src/graph-query.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L152)

Bounded retries on transport / server `error` outcomes (reads are idempotent). Default: 2.
