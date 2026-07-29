[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / createGraphMutationClient

# Function: createGraphMutationClient()

> **createGraphMutationClient**(`options`): [`GraphMutationClient`](../interfaces/GraphMutationClient.md)

Defined in: core/dist/graph/graph-mutation-client.d.ts:73

Build a [GraphMutationClient](../interfaces/GraphMutationClient.md). The returned client never rejects: every failure —
ops-builder throw, propose throw, transport error, `refreshBase` throw — settles to the
channel's `{ status: 'error' }` shape, mirroring `sendGraphMutation`'s one-shape contract.

## Parameters

### options

[`GraphMutationClientOptions`](../interfaces/GraphMutationClientOptions.md)

## Returns

[`GraphMutationClient`](../interfaces/GraphMutationClient.md)
