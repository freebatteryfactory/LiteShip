[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / graphQueryEtag

# Function: graphQueryEtag()

> **graphQueryEtag**(`graph`): `string`

Defined in: [core/src/graph/graph-query.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query.ts#L57)

The cache validator for conditional reads — sha256 `integrity_digest`, NOT the
fnv1a display `id`. The digest excludes mutable `meta` by construction, so a
meta-only advance (display/version bookkeeping) intentionally does NOT
invalidate a cached graph: CAS correctness keys on `base.id`, and `meta` is
display-layer data that never participates in patch application. Documented
contract, not an oversight.

## Parameters

### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

## Returns

`string`
