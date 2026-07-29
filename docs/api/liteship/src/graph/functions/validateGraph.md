[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / validateGraph

# Function: validateGraph()

> **validateGraph**(`graph`): \{ `ok`: `true`; \} \| \{ `errors`: readonly `PlanValidationError`[]; `ok`: `false`; \}

Defined in: core/dist/graph/document-graph-address.d.ts:55

Validate structural integrity: no cycles, every edge endpoint references an existing node. Reuses `Plan.validate`.

## Parameters

### graph

#### edges

readonly [`DocumentGraphEdge`](../interfaces/DocumentGraphEdge.md)[]

#### nodes

readonly [`DocumentGraphNode`](../type-aliases/DocumentGraphNode.md)[]

## Returns

\{ `ok`: `true`; \} \| \{ `errors`: readonly `PlanValidationError`[]; `ok`: `false`; \}
