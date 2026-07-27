[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / GraphQueryEtagCandidates

# Interface: GraphQueryEtagCandidates

Defined in: core/dist/graph/graph-query.d.ts:56

Parsed multi-member `If-None-Match`: sha256 candidates plus the `*` wildcard.

## Properties

### candidates

> `readonly` **candidates**: readonly `string`[]

Defined in: core/dist/graph/graph-query.d.ts:57

***

### matchAny

> `readonly` **matchAny**: `boolean`

Defined in: core/dist/graph/graph-query.d.ts:59

RFC 9110: `If-None-Match: *` matches any current representation.
