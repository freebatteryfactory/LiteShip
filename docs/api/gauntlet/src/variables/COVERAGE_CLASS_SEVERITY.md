[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / COVERAGE\_CLASS\_SEVERITY

# Variable: COVERAGE\_CLASS\_SEVERITY

> `const` **COVERAGE\_CLASS\_SEVERITY**: `Readonly`\<`Record`\<`"same"` \| `"cross"`, `"advisory"` \| `"warning"` \| `"error"`\>\>

Defined in: [gauntlet/src/repo-ir.ts:95](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L95)

The redlinable coverage-class severity matrix (design §2 — the data knob the
owner redlines, sibling to the assurance map). It calibrates how LOUD an
oracle-divergence finding is from the coverage-class PAIR of the two
disagreeing oracles — NOT a baked-in if-ladder.

The doctrine (owner-ratified REPORT-not-DECIDE model):
- SAME class disagreeing = a real CONTRADICTION (two equally-strong oracles
  cannot both be right) → `'error'` (loud — investigate).
- CROSS class disagreeing = a coverage GAP, not a contradiction: the weaker
  oracle is known-imprecise (e.g. `text-only` regex vs `file-proxy-only` AST),
  so the divergence is the work-list signal to RETIRE the weak oracle → quieter
  `'advisory'`. Keeping cross-class quiet is the watch-item: it must never drown
  the same-class real contradictions.

The matrix is symmetric (the pair `(a, b)` and `(b, a)` calibrate identically) —
[coverageClassSeverity](../functions/coverageClassSeverity.md) normalizes the lookup so callers need not order
the arguments. It is exported DATA: a downstream owner can redline the table
without touching the divergence gate's fold logic.
