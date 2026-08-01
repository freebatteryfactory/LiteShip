[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / GraphMutationClientOptions

# Interface: GraphMutationClientOptions

Defined in: core/dist/graph/graph-mutation-client.d.ts:22

Configuration for [createGraphMutationClient](../functions/createGraphMutationClient.md) — endpoint, initial base, and stale-recovery policy.

## Properties

### base

> `readonly` **base**: [`DocumentGraph`](DocumentGraph.md)

Defined in: core/dist/graph/graph-mutation-client.d.ts:26

The initial client-side base graph (e.g. decoded from an initial GET or inlined SSR data).

***

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: core/dist/graph/graph-mutation-client.d.ts:28

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

Defined in: core/dist/graph/graph-mutation-client.d.ts:36

Bounded stale-base retries. Default: 1 when `refreshBase` is provided, else 0.

***

### refreshBase?

> `readonly` `optional` **refreshBase?**: () => `Promise`\<[`DocumentGraph`](DocumentGraph.md)\>

Defined in: core/dist/graph/graph-mutation-client.d.ts:34

Host-owned base reloader (e.g. GET the host's graph endpoint and decode). When present,
a `staleBase` refusal triggers reload + re-propose up to `maxStaleRetries` times.
LiteShip does not dictate the read endpoint's shape — the host owns it.

#### Returns

`Promise`\<[`DocumentGraph`](DocumentGraph.md)\>

***

### timeoutMs?

> `readonly` `optional` **timeoutMs?**: `number`

Defined in: core/dist/graph/graph-mutation-client.d.ts:44

Abort a submit's request after this many milliseconds, settling it to the channel's
`{ status: 'error' }` shape. A finite non-negative value overrides
[GRAPH\_MUTATION\_DEFAULT\_TIMEOUT\_MS](../variables/GRAPH_MUTATION_DEFAULT_TIMEOUT_MS.md); `undefined`, non-finite, and negative
values use that finite default. An unbounded request is deliberately not expressible:
it would hold every later submit in this client's serialized queue.

***

### url

> `readonly` **url**: `string`

Defined in: core/dist/graph/graph-mutation-client.d.ts:24

The mutation endpoint `sendGraphMutation` POSTs to.
