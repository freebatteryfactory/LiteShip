[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / EvidenceChannel

# Type Alias: EvidenceChannel

> **EvidenceChannel** = `"allFiles"` \| `"ir.facts"` \| `"ir.refs"` \| [`FactChannel`](FactChannel.md)

Defined in: [gauntlet/src/evidence-recorder.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L91)

The closed set of EVIDENCE CHANNELS the recorder tracks — every read surface a
gate's verdict can depend on BEYOND the in-IR coverage digest. `ir.facts` /
`ir.refs` are tracked because their VALUES are host-oracle-computed (covered by
the toolchain digest, not the coverage digest); the [FactChannel](FactChannel.md)s are the
injected-fact families (derived from [FACT\_CHANNELS](../variables/FACT_CHANNELS.md), never re-typed);
`allFiles` + an out-of-IR `readFile` are the file confirmer corpora. An in-IR
`readFile` is NOT a channel — those bytes ARE the coverage digest, so reading them
needs no `evidenceDigest`.
