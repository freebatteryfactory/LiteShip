[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / validateGraph

# Function: validateGraph()

> **validateGraph**(`graph`): \{ `ok`: `true`; \} \| \{ `errors`: readonly `PlanValidationError`[]; `ok`: `false`; \}

Defined in: [core/src/document-graph-address.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph-address.ts#L132)

Validate structural integrity: no cycles, every edge endpoint references an existing node. Reuses `Plan.validate`.

## Parameters

### graph

#### edges

readonly [`DocumentGraphEdge`](../interfaces/DocumentGraphEdge.md)[]

#### nodes

readonly [`DocumentGraphNode`](../type-aliases/DocumentGraphNode.md)[]

## Returns

\{ `ok`: `true`; \} \| \{ `errors`: readonly `PlanValidationError`[]; `ok`: `false`; \}
