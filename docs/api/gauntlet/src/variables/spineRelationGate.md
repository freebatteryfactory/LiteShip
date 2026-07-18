[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / spineRelationGate

# Variable: spineRelationGate

> `const` **spineRelationGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/spine-relation.ts:207](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/spine-relation.ts#L207)

The two-axis spine-relation gate — each admitted mirror type whose OBSERVED relation
no longer satisfies its ADMITTED (frozen) relation becomes a self-explaining Finding
naming both axes; each unresolved mirror is a broken-contract Finding. Folds
host-injected [SpineRelationFacts](../interfaces/SpineRelationFacts.md). REPORT-not-DECIDE. It
[requireSpineRelation](../functions/requireSpineRelation.md), so it runs only on the opt-in host path. Earns
blocking authority via the shipped ratchet.
