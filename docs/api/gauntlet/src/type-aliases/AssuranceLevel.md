[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / AssuranceLevel

# Type Alias: AssuranceLevel

> **AssuranceLevel** = `"L0"` \| `"L1"` \| `"L2"` \| `"L3"` \| `"L4"`

Defined in: [gauntlet/src/assurance.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/assurance.ts#L21)

The criticality ladder. Higher = more rigor required, more blast radius if it
lies. `L4` is the "if this lies, downstream trusts bad reality" tier — the
cast pipeline, evaluator, validator, content-address, HLC, graph-patch.
