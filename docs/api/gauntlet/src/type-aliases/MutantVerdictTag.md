[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / MutantVerdictTag

# Type Alias: MutantVerdictTag

> **MutantVerdictTag** = `"killed"` \| `"survived"` \| `"no-coverage"` \| `"equivalent"` \| `"inconclusive"`

Defined in: [gauntlet/src/facts/mutation-facts.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L107)

The verdict an evaluated mutant earned — a `_tag` discriminant (composition).
 - `killed` — a covering test failed on the mutation (adequate coverage).
 - `survived` — every covering test passed (a coverage divergence, a finding).
 - `no-coverage` — no test covers the site (the worst signal, a finding).
 - `equivalent` — a RUNTIME mutation the engine cannot exclude but that is
   provably behaviour-identical to the original (e.g. an unreachable comparator
   boundary on always-distinct object keys, or a default-value rewrite that routes
   to the same branch). Recorded against a CONTENT-ADDRESSED, justified registry
   entry — NEVER a fake test. An `equivalent` mutant is excluded from BOTH the
   survivor work-list AND the score denominator (it is not a coverage gap), yet it
   is RECORDED + reviewable. It is distinct from `killed`: a killed mutant proves a
   test exists; an equivalent mutant proves no test COULD exist (there is nothing to
   observe). Type-level (erased) mutations are excluded at the SOURCE by the engine
   and never reach a verdict; `equivalent` is only ever a justified RUNTIME mutant.
 - `inconclusive` — the runner could not mint a trustworthy kill/survive verdict
   for this mutant (subprocess spawn fault, exit/report disagreement, zero tests
   executed). Recorded fail-closed: it counts in the score denominator and folds
   to a BLOCKING finding, but it no longer aborts the whole campaign — the twice-
   measured defect (crons 30342905791 + 30526718746) where ONE unmintable verdict
   80 minutes in discarded every verdict already earned.
