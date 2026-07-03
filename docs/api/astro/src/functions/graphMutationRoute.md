[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / graphMutationRoute

# Function: graphMutationRoute()

> **graphMutationRoute**(`store`): (`request`) => `Promise`\<`Response`\>

Defined in: astro/src/graph-mutation-route.ts:45

Build a POST handler that validates + applies a client-proposed `GraphPatch`
against the host's current graph:
  - **200** on apply — body is `{ status: 'applied', graph }` (the new sealed graph);
  - **422** on refusal — body is `{ status: 'refused', errors }` (validation reasons);
  - **400** on an unparseable request body.

The host supplies the `GraphStore` (its authority boundary); everything the
seam guarantees — a stale-base / dangling-edge / malformed patch never mutates the
graph — holds unchanged over HTTP.

## Parameters

### store

`GraphStore`

## Returns

(`request`) => `Promise`\<`Response`\>
