[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / GraphQueryRequest

# Interface: GraphQueryRequest

Defined in: core/dist/graph/graph-query.d.ts:19

Optional conditional-read validator carried on the wire or from `If-None-Match`.

## Properties

### ifNoneMatch?

> `readonly` `optional` **ifNoneMatch?**: `string`

Defined in: core/dist/graph/graph-query.d.ts:21

Client's cached etag — MUST be the sha256 `integrity_digest`, never fnv1a.
