[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GATE\_FACT\_CHANNELS

# Variable: GATE\_FACT\_CHANNELS

> `const` **GATE\_FACT\_CHANNELS**: readonly \[`"supplyChain"`, `"mutation"`, `"transition"`, `"spineRelation"`, `"mcdc"`, `"simulation"`, `"traceability"`, `"standards"`, `"declaredFix"`, `"taint"`, `"capabilityLink"`, `"fuzzCorpus"`, `"proof"`, `"composition"`, `"skipSites"`, `"activeSurfaceFacts"`, `"checkGovernance"`, `"benchmarkSubjects"`\]

Defined in: [gauntlet/src/gate.ts:421](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L421)

Runtime fact channels a hosted gate may consume. This tuple is the canonical
runtime vocabulary used by gate access manifests and by the instrumented
evidence recorder. It is kept distinct from [FACT\_KINDS](FACT_KINDS.md): FactGate is
the deliberately smaller, data-only subset currently admitted by that
constructor, while hosted gates can consume the remaining host-produced fact
families through explicit access declarations.
