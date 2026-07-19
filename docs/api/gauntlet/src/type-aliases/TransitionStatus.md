[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / TransitionStatus

# Type Alias: TransitionStatus

> **TransitionStatus** = `"equivalent"` \| `"divergent"` \| `"unevidenced"`

Defined in: [gauntlet/src/facts/transition-facts.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/transition-facts.ts#L60)

The verdict a bisimulation case earned — a bare string-union field (the same flat
discriminant shape as [MutantVerdictTag](MutantVerdictTag.md), NOT a nested `_tag` object), so the
facts stay flat, JSON-stable, and byte-identical across runs over unchanged inputs.
 - `equivalent` — the model and implementation observation digests AGREE: the
   bisimulation held over this op history (the conformant green — no finding). The
   named equivalence relation is bisimulation (constitution §3 / Axiom 4).
 - `divergent` — the two observation digests DIFFER: the transport produced a
   different observable trace for the same history — a behavior change (a finding,
   the cage's whole purpose).
 - `unevidenced` — at least one oracle side produced NO observation (a construction
   fault, an unsupported op, a missing trace). SEPARATE from divergence (Axiom 4):
   a witness-missing case, never a fidelity claim. Excluded from divergence, ridden
   by the [TransitionFacts.unevidencedBaseline](../interfaces/TransitionFacts.md#unevidencedbaseline) ratchet.
