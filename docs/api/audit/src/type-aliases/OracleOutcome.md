[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / OracleOutcome

# Type Alias: OracleOutcome

> **OracleOutcome** = \{ `kind`: `"observed"`; `observation`: `unknown`; \} \| \{ `kind`: `"unevidenced"`; `reason`: `string`; \}

Defined in: [audit/src/transition-facts-build.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L67)

One oracle side's outcome for a case — either the NORMALIZED OBSERVATION the side
produced (any CBOR-encodable trace value: the closed `Observation` record the Foundation
harness folds, e.g.) or an UNEVIDENCED marker (the side produced no trace: a construction
fault, an unsupported op, a drained-empty result). The caller hands the builder the raw
observation, NOT a pre-computed digest: the builder owns the canonical encoding + the
byte-exact comparison, so the bisimulation verdict never rides a hash equality (a digest
collision could otherwise certify a real divergence as `equivalent` — a false L4 green).
