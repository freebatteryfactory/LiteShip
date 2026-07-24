[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DocumentGraphEdge

# Interface: DocumentGraphEdge

Defined in: [core/src/graph/document-graph.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L158)

A directed edge over node content addresses. This is `PlanEdge` lifted from
opaque step-id strings to typed node `ContentAddress`es; `EdgeType` is reused
verbatim from `plan.ts` (both endpoints stay in the fnv1a identity law).

## Properties

### from

> `readonly` **from**: `ContentAddress`

Defined in: [core/src/graph/document-graph.ts:159](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L159)

***

### to

> `readonly` **to**: `ContentAddress`

Defined in: [core/src/graph/document-graph.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L160)

***

### type

> `readonly` **type**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/graph/document-graph.ts:161](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L161)
