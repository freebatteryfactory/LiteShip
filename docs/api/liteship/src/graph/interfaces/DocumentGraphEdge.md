[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / DocumentGraphEdge

# Interface: DocumentGraphEdge

Defined in: core/dist/graph/document-graph.d.ts:143

A directed edge over node content addresses. This is `PlanEdge` lifted from
opaque step-id strings to typed node `ContentAddress`es; `EdgeType` is reused
verbatim from `plan.ts` (both endpoints stay in the fnv1a identity law).

## Properties

### from

> `readonly` **from**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/document-graph.d.ts:144

***

### to

> `readonly` **to**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/document-graph.d.ts:145

***

### type

> `readonly` **type**: `EdgeType`

Defined in: core/dist/graph/document-graph.d.ts:146
