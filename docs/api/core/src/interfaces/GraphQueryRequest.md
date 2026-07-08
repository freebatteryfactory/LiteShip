[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphQueryRequest

# Interface: GraphQueryRequest

Defined in: [core/src/graph-query.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L23)

Optional conditional-read validator carried on the wire or from `If-None-Match`.

## Properties

### ifNoneMatch?

> `readonly` `optional` **ifNoneMatch?**: `string`

Defined in: [core/src/graph-query.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L25)

Client's cached etag — MUST be the sha256 `integrity_digest`, never fnv1a.
