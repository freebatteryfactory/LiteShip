[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphMutationRequest

# Interface: GraphMutationRequest

Defined in: core/src/graph-mutation.ts:39

A client's mutation request: the proposed patch as it arrived over the wire
(untrusted `unknown` — a serialized [GraphPatch](../variables/GraphPatch.md) envelope). It is decoded
and validated on the server; the client never mutates the graph directly.

## Properties

### patch

> `readonly` **patch**: `unknown`

Defined in: core/src/graph-mutation.ts:41

The raw, untrusted GraphPatch envelope the client proposed (e.g. parsed JSON).
