[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / stableEvidenceDigest

# Function: stableEvidenceDigest()

> **stableEvidenceDigest**(`entries`): `string`

Defined in: [gauntlet/src/verdict-cache.ts:236](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L236)

A deterministic STRING fold over a gate's OUT-OF-IR evidence — the helper a
[Gate.evidenceDigest](../interfaces/Gate.md#evidencedigest) returns. Each entry is a `(label, bytes)` pair (e.g.
`["tests/foo.test.ts", "<file body>"]` for a confirmer corpus, or
`["fact", stableSerialize(facts)]` for an injected fact). The pairs are SORTED by
label so the fold is order-independent (the same canonical-key-order doctrine
[coverageDigestOf](coverageDigestOf.md) uses), then concatenated with the `UNIT`/`RECORD`
control bytes. PURE + lean: no crypto, no fs — it stably concatenates the bytes the
gate already read through the [GateContext](../interfaces/GateContext.md); the HOST hashes the resulting
key into a short filename slug. The `ev:` scheme prefix marks the result a REAL
evidence fold so it can never collide with [NO\_EVIDENCE\_MARKER](../variables/NO_EVIDENCE_MARKER.md).

SOUNDNESS: the entries MUST be EXACTLY the out-of-IR bytes the gate's `run` reads
(same files, same fact). A digest that omits a byte the gate reads is the same
too-narrow-coverage SOUNDNESS BUG `coverage` warns about — it would serve a stale
verdict when that byte changed. When in doubt, fold MORE (the cost is a needless
MISS, never a stale serve).

## Parameters

### entries

readonly readonly \[`string`, `string`\][]

## Returns

`string`
