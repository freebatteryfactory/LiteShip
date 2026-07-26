[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / GraphMutationClientOptions

# Interface: GraphMutationClientOptions

Defined in: core/dist/graph/graph-mutation-client.d.ts:17

Configuration for [createGraphMutationClient](../functions/createGraphMutationClient.md) — endpoint, initial base, and stale-recovery policy.

## Properties

### base

> `readonly` **base**: [`DocumentGraph`](DocumentGraph.md)

Defined in: core/dist/graph/graph-mutation-client.d.ts:21

The initial client-side base graph (e.g. decoded from an initial GET or inlined SSR data).

***

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: core/dist/graph/graph-mutation-client.d.ts:23

Injectable fetch for tests / non-browser hosts. Defaults to global fetch.

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

### maxStaleRetries?

> `readonly` `optional` **maxStaleRetries?**: `number`

Defined in: core/dist/graph/graph-mutation-client.d.ts:31

Bounded stale-base retries. Default: 1 when `refreshBase` is provided, else 0.

***

### refreshBase?

> `readonly` `optional` **refreshBase?**: () => `Promise`\<[`DocumentGraph`](DocumentGraph.md)\>

Defined in: core/dist/graph/graph-mutation-client.d.ts:29

Host-owned base reloader (e.g. GET the host's graph endpoint and decode). When present,
a `staleBase` refusal triggers reload + re-propose up to `maxStaleRetries` times.
LiteShip does not dictate the read endpoint's shape — the host owns it (ADR-0015).

#### Returns

`Promise`\<[`DocumentGraph`](DocumentGraph.md)\>

***

### timeoutMs?

> `readonly` `optional` **timeoutMs?**: `number`

Defined in: core/dist/graph/graph-mutation-client.d.ts:38

Abort a submit's request after this many milliseconds, settling it to the channel's
`{ status: 'error' }` shape. Without it, a hung request holds the SERIALIZED submit
queue for as long as the runtime's own fetch deadline (minutes in some browsers) —
every queued submit on this client waits behind it. Default: no client-side timeout.

***

### url

> `readonly` **url**: `string`

Defined in: core/dist/graph/graph-mutation-client.d.ts:19

The mutation endpoint `sendGraphMutation` POSTs to.
