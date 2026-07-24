[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphQueryEtagCandidates

# Interface: GraphQueryEtagCandidates

Defined in: [core/src/graph/graph-query.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query.ts#L62)

Parsed multi-member `If-None-Match`: sha256 candidates plus the `*` wildcard.

## Properties

### candidates

> `readonly` **candidates**: readonly `string`[]

Defined in: [core/src/graph/graph-query.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query.ts#L63)

***

### matchAny

> `readonly` **matchAny**: `boolean`

Defined in: [core/src/graph/graph-query.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query.ts#L65)

RFC 9110: `If-None-Match: *` matches any current representation.
