[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FACT\_CHANNELS

# Variable: FACT\_CHANNELS

> `const` **FACT\_CHANNELS**: readonly \[`"supplyChain"`, `"mutation"`, `"mcdc"`, `"simulation"`, `"traceability"`, `"standards"`, `"declaredFix"`, `"taint"`, `"capabilityLink"`, `"fuzzCorpus"`, `"proof"`, `"composition"`, `"skipSites"`, `"activeSurfaceFacts"`\]

Defined in: [gauntlet/src/evidence-recorder.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L57)

The SINGLE SOURCE OF TRUTH for the injected-fact channels — every optional fact key
a [GateContext](../interfaces/GateContext.md) can carry, as a runtime tuple. The [EvidenceChannel](../type-aliases/EvidenceChannel.md)
type, the recorder's per-channel getter installation, AND the meta-test's
perturbation loop ALL derive from this one list (the test imports it, the type is
`typeof FACT_CHANNELS[number]`), so a new fact channel is added in ONE place.

A TypeScript type cannot be reflected into a runtime array, so this tuple is the
canonical runtime list; it is PINNED to [GateContext](../interfaces/GateContext.md) by the compile-time
`_factChannelsExhaustive` conformance assertion below — adding a fact key to
`GateContext` WITHOUT adding it here (or vice versa) is a BUILD ERROR, so the list
cannot silently drift from the context shape. This closes the residual where the
recorder hand-maintained a copy that could fall behind the context.
