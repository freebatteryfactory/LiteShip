[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / GraphMutationRequest

# Interface: GraphMutationRequest

Defined in: core/dist/graph/graph-mutation.d.ts:36

A client's mutation request: the proposed patch as it arrived over the wire
(untrusted `unknown` — a serialized [GraphPatch](../variables/GraphPatch.md) envelope). It is decoded
and validated on the server; the client never mutates the graph directly.

## Properties

### patch

> `readonly` **patch**: `unknown`

Defined in: core/dist/graph/graph-mutation.d.ts:38

The raw, untrusted GraphPatch envelope the client proposed (e.g. parsed JSON).
