[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / MutantVerdictTag

# Type Alias: MutantVerdictTag

> **MutantVerdictTag** = `"killed"` \| `"survived"` \| `"no-coverage"` \| `"equivalent"`

Defined in: [gauntlet/src/mutation-facts.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts#L66)

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
