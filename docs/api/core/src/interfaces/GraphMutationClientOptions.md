[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphMutationClientOptions

# Interface: GraphMutationClientOptions

Defined in: [core/src/graph-mutation-client.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L19)

Configuration for [createGraphMutationClient](../functions/createGraphMutationClient.md) — endpoint, initial base, and stale-recovery policy.

## Properties

### base

> `readonly` **base**: [`DocumentGraph`](DocumentGraph.md)

Defined in: [core/src/graph-mutation-client.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L23)

The initial client-side base graph (e.g. decoded from an initial GET or inlined SSR data).

***

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: [core/src/graph-mutation-client.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L25)

Injectable fetch for tests / non-browser hosts. Defaults to global fetch.

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

### maxStaleRetries?

> `readonly` `optional` **maxStaleRetries?**: `number`

Defined in: [core/src/graph-mutation-client.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L33)

Bounded stale-base retries. Default: 1 when `refreshBase` is provided, else 0.

***

### refreshBase?

> `readonly` `optional` **refreshBase?**: () => `Promise`\<[`DocumentGraph`](DocumentGraph.md)\>

Defined in: [core/src/graph-mutation-client.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L31)

Host-owned base reloader (e.g. GET the host's graph endpoint and decode). When present,
a `staleBase` refusal triggers reload + re-propose up to `maxStaleRetries` times.
LiteShip does not dictate the read endpoint's shape — the host owns it (ADR-0015).

#### Returns

`Promise`\<[`DocumentGraph`](DocumentGraph.md)\>

***

### timeoutMs?

> `readonly` `optional` **timeoutMs?**: `number`

Defined in: [core/src/graph-mutation-client.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L40)

Abort a submit's request after this many milliseconds, settling it to the channel's
`{ status: 'error' }` shape. Without it, a hung request holds the SERIALIZED submit
queue for as long as the runtime's own fetch deadline (minutes in some browsers) —
every queued submit on this client waits behind it. Default: no client-side timeout.

***

### url

> `readonly` **url**: `string`

Defined in: [core/src/graph-mutation-client.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L21)

The mutation endpoint `sendGraphMutation` POSTs to.
