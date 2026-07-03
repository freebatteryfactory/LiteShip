[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / handleGraphMutation

# Function: handleGraphMutation()

> **handleGraphMutation**(`request`, `store`): `Promise`\<[`GraphMutationResponse`](../type-aliases/GraphMutationResponse.md)\>

Defined in: [core/src/graph-mutation.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation.ts#L99)

Process one client mutation against the host's current graph. Pure of transport:
decode → load → validate → apply → save. NEVER throws — every failure maps to a
response shape, so the caller has exactly one thing to serialize:
  - a bad proposal (malformed envelope, validation rejection, CAS miss) → `refused`;
  - a store I/O failure (loadGraph / saveGraph reject) → `error` (not the client's
    fault; a raw persistence error must not escape as an unstructured 500).

## Parameters

### request

[`GraphMutationRequest`](../interfaces/GraphMutationRequest.md)

### store

[`GraphStore`](../interfaces/GraphStore.md)

## Returns

`Promise`\<[`GraphMutationResponse`](../type-aliases/GraphMutationResponse.md)\>
