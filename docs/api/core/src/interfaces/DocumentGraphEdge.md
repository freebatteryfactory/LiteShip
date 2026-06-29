[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DocumentGraphEdge

# Interface: DocumentGraphEdge

Defined in: [core/src/document-graph.ts:149](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L149)

A directed edge over node content addresses. This is `PlanEdge` lifted from
opaque step-id strings to typed node `ContentAddress`es; `EdgeType` is reused
verbatim from `plan.ts` (both endpoints stay in the fnv1a identity law).

## Properties

### from

> `readonly` **from**: `ContentAddress`

Defined in: [core/src/document-graph.ts:150](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L150)

***

### to

> `readonly` **to**: `ContentAddress`

Defined in: [core/src/document-graph.ts:151](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L151)

***

### type

> `readonly` **type**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/document-graph.ts:152](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L152)
