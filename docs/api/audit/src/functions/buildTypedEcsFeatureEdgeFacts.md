[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / buildTypedEcsFeatureEdgeFacts

# Function: buildTypedEcsFeatureEdgeFacts()

> **buildTypedEcsFeatureEdgeFacts**(`options`): `FeatureEdgeFamilyFacts`

Defined in: [audit/src/feature-edge-census.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/feature-edge-census.ts#L79)

Enumerate a minted-Part ECS from the same runtime catalogs that execute it.

Seedable Parts and declared system writes are producers. Required/optional
system reads are consumers. A Part referenced by any of those catalogs but
absent from the canonical declaration owner is refused before facts exist.

## Parameters

### options

[`TypedEcsFeatureEdgeOptions`](../interfaces/TypedEcsFeatureEdgeOptions.md)

## Returns

`FeatureEdgeFamilyFacts`
