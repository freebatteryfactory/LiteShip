[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / handleGraphMutation

# Function: handleGraphMutation()

> **handleGraphMutation**(`request`, `store`): `Promise`\<[`GraphMutationResponse`](../type-aliases/GraphMutationResponse.md)\>

Defined in: [core/src/graph-mutation.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation.ts#L84)

Process one client mutation against the host's current graph. Pure of transport:
decode → validate → apply → save, returning `applied` (new sealed graph) or
`refused` (structured errors). Never throws for a bad proposal — a malformed
envelope becomes a `refused` response, exactly like a validation rejection, so
the caller has one shape to serialize.

## Parameters

### request

[`GraphMutationRequest`](../interfaces/GraphMutationRequest.md)

### store

[`GraphStore`](../interfaces/GraphStore.md)

## Returns

`Promise`\<[`GraphMutationResponse`](../type-aliases/GraphMutationResponse.md)\>
