[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DocumentGraphEdge

# Interface: DocumentGraphEdge

Defined in: [core/src/document-graph.ts:156](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L156)

A directed edge over node content addresses. This is `PlanEdge` lifted from
opaque step-id strings to typed node `ContentAddress`es; `EdgeType` is reused
verbatim from `plan.ts` (both endpoints stay in the fnv1a identity law).

## Properties

### from

> `readonly` **from**: `ContentAddress`

Defined in: [core/src/document-graph.ts:157](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L157)

***

### to

> `readonly` **to**: `ContentAddress`

Defined in: [core/src/document-graph.ts:158](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L158)

***

### type

> `readonly` **type**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/document-graph.ts:159](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L159)
