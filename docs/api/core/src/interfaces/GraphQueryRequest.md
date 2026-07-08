[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphQueryRequest

# Interface: GraphQueryRequest

Defined in: [core/src/graph-query.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L22)

Optional conditional-read validator carried on the wire or from `If-None-Match`.

## Properties

### ifNoneMatch?

> `readonly` `optional` **ifNoneMatch?**: `string`

Defined in: [core/src/graph-query.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L24)

Client's cached etag — MUST be the sha256 `integrity_digest`, never fnv1a.
