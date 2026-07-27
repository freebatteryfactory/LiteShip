[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createGraphMutationClient

# Function: createGraphMutationClient()

> **createGraphMutationClient**(`options`): [`GraphMutationClient`](../interfaces/GraphMutationClient.md)

Defined in: [core/src/graph/graph-mutation-client.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-mutation-client.ts#L97)

Build a [GraphMutationClient](../interfaces/GraphMutationClient.md). The returned client never rejects: every failure —
ops-builder throw, propose throw, transport error, `refreshBase` throw — settles to the
channel's `{ status: 'error' }` shape, mirroring `sendGraphMutation`'s one-shape contract.

## Parameters

### options

[`GraphMutationClientOptions`](../interfaces/GraphMutationClientOptions.md)

## Returns

[`GraphMutationClient`](../interfaces/GraphMutationClient.md)
