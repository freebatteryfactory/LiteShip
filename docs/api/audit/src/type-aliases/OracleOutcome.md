[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / OracleOutcome

# Type Alias: OracleOutcome

> **OracleOutcome** = \{ `kind`: `"observed"`; `observationDigest`: `string`; \} \| \{ `kind`: `"unevidenced"`; `reason`: `string`; \}

Defined in: [audit/src/transition-facts-build.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L46)

One oracle side's outcome for a case — either a content-addressed OBSERVATION (the
side produced a comparable trace) or an UNEVIDENCED marker (the side produced no
trace: a construction fault, an unsupported op, a drained-empty result). The caller's
harness computes the observation digest through the SAME canonical encoder the
builder uses for the history (so the digests are comparable across the cage).
