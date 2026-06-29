[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / CoverageClass

# Type Alias: CoverageClass

> **CoverageClass** = `"symbol-evidenced"` \| `"file-proxy-only"` \| `"text-only"` \| `"runtime-evidenced"`

Defined in: [gauntlet/src/repo-ir.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L70)

How a fact was evidenced — the provenance-honesty model carried forward from
`@czap/audit`'s `coverageClassification`, so "0 findings" can never be read as
"checked and clean" when it was only ever a weak proxy. This is DATA the
divergence layer reads (design §2): a same-class disagreement is a real
contradiction; a cross-class one is a coverage gap + a retire-the-weak-oracle
signal.

The four classes are the oracle-provenance subset of audit's superset
(`clean`/`allowlisted`/`policy-absent`/`not-checked` are audit-section
verdicts, not fact-provenance, so they are NOT mirrored here):
- `symbol-evidenced` — resolved by the type checker (cross-package types,
  factory return-types). The strongest evidence. (= audit's `symbol-evidenced`.)
- `file-proxy-only` — AST / module-graph evidence at file granularity, no type
  resolution. (= audit's `file-proxy-only`.)
- `text-only` — regex / textual evidence; known-imprecise (the class the
  Slice-B oracle work exists to retire).
- `runtime-evidenced` — observed from a command/capsule receipt at run time
  (markerCount, frameCount, resultId), not statically derived.
