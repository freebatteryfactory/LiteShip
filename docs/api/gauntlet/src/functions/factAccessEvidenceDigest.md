[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / factAccessEvidenceDigest

# Function: factAccessEvidenceDigest()

> **factAccessEvidenceDigest**(`label`, `fact`): `string`

Defined in: [gauntlet/src/verdict-cache.ts:319](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L319)

The SINGLE OUT-OF-IR evidence digest for an INJECTED-FACT gate — the one-line
[Gate.evidenceDigest](../interfaces/Gate.md#evidencedigest) for a gate whose verdict folds a single host-injected
fact (`context.mutation` / `context.supplyChain` / `context.traceability` / …) whose
SOURCE bytes (the per-mutant verdicts, the lockfile, the ledger, the snapshot) are an
EXTERNAL artifact OUTSIDE the IR. This is ABSENCE-AWARE: it folds whether the channel
was PRESENT or ACCESSED-AND-ABSENT, the structural soundness keystone for the
not-evidenced gate families (supply-chain, simulation, standards, …). When a gate
ACCESSES the channel and finds it ABSENT, its verdict (the `not-evidenced` advisories)
DEPENDS on that absence, so the digest folds a DISTINCT accessed-and-absent segment
([ACCESSED\_ABSENT\_MARKER](../variables/ACCESSED_ABSENT_MARKER.md)) rather than collapsing to `undefined` / the
no-evidence marker. This makes the verdict key reflect absence-dependence:
 - PRESENT  → a real `ev:` content fold of the fact (any content change flips it);
 - ABSENT   → the `absent:accessed` marker (DISTINCT from never-accessed);
so flipping the channel absent↔present (everything else fixed) ALWAYS flips the key —
a warm cache can never serve an absent-world verdict to a present world (or vice versa).

THE ONE FACT-EVIDENCE DIGEST (Codex round-6 P3): there is intentionally NO non-absence-
aware sibling. The earlier `injectedFactEvidenceDigest` (which returned `undefined` on
absence, collapsing absent into the no-evidence marker) was a soundness drift — a gate
that branches on a fact's ABSENCE did not fold that dependence into its key, so the
cache could serve a verdict computed under the other absence-state. Every fact-consuming
gate now uses THIS digest; the present-fact fold is byte-identical to the old helper's
(`stableEvidenceDigest([[label, stableSerialize(fact)]])`), so present-fact cache keys are
UNCHANGED, while absent-fact keys now correctly key apart from present-fact keys.

The label namespaces the fact family so two gates that both inject (different) facts
cannot collide; a present value is folded via [stableSerialize](stableSerialize.md) (recursive,
key-sorted) so structurally-equal facts digest identically and ANY content change — a
flipped mutant verdict, an edited ledger line, a new SBOM entry — flips the key. PURE,
lean, deterministic — no clock, no I/O.

## Parameters

### label

`string`

### fact

`unknown`

## Returns

`string`
