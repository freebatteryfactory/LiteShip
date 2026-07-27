[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / featureEdgeSubjectCoverage

# Function: featureEdgeSubjectCoverage()

> **featureEdgeSubjectCoverage**(`facts`): [`GateSubjectCoverage`](../type-aliases/GateSubjectCoverage.md)

Defined in: [gauntlet/src/facts/feature-edge-facts.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/feature-edge-facts.ts#L147)

Project the family receipts into the gauntlet's generic qualification axis.

Missing, duplicated, mismatched, or opaque families make the whole claim
opaque. The aggregate SHA is host-minted over ordered family ids + receipts;
gauntlet checks its structural invariants without taking a hashing dependency.

## Parameters

### facts

[`FeatureEdgeFacts`](../interfaces/FeatureEdgeFacts.md) \| `undefined`

## Returns

[`GateSubjectCoverage`](../type-aliases/GateSubjectCoverage.md)
