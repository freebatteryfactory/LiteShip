[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / CoverageEvidence

# Type Alias: CoverageEvidence

> **CoverageEvidence** = \{ `_tag`: `"execution"`; `testId`: `string`; \} \| \{ `_tag`: `"static-reference"`; `testId`: `string`; \} \| \{ `_tag`: `"none"`; \}

Defined in: [gauntlet/src/composition-facts.ts:110](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/composition-facts.ts#L110)

How an integration-coverage verdict was evidenced — the provenance-honesty model,
sibling to [CoverageClass](CoverageClass.md). A `_tag` discriminant (composition):
 - `execution` — a test whose EXECUTION coverage shows BOTH endpoints' bodies ran
   (the precise signal; a v8 per-test probe). The strongest evidence.
 - `static-reference` — a test that statically REFERENCES both endpoints (imports
   or names both) but with no execution probe. The SOUND over-approximation: it
   may name both without driving the call, so a `static-reference` "covered" edge
   is NOT proof of integration coverage — it only suppresses the finding when at
   least one test touches both endpoints. The finding STATES this class was used.
 - `none` — no test references both endpoints at all (the strongest `uncovered`
   signal: not even a test that mentions both).
