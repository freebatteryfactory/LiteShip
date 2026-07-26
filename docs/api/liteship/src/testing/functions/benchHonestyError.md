[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / benchHonestyError

# Function: benchHonestyError()

> **benchHonestyError**(`capName`, `benchSource`, `benchExemption`): `string` \| `null`

Defined in: core/dist/evidence/bench-classify.d.ts:25

Honesty verdict for ONE generated bench — the ONE definition the gate
(capsule-verify) and its meta-test share. Returns a human-readable error for a
BANNED disposition, or `null` when the bench is honest. Four states:
 - **REAL** — a genuine measurement: a non-comment `bench()` body, no marker,
   no manifest exemption → honest (`null`).
 - **TYPED NOT-APPLICABLE** — the `// BENCH-NOT-APPLICABLE: <reason>` marker
   line + a real premise-guard body (so it classifies 'real') + a manifest
   `benchExemption` whose reason MATCHES → honest (`null`).
 - **LAZY PLACEHOLDER** (banned) — a comment-only body that measures nothing:
   the bench analogue of `it.skip`.
 - **MISMATCH** (banned) — marker without manifest record, manifest record
   without marker, or disagreeing reasons: silent drift.

## Parameters

### capName

`string`

### benchSource

`string`

### benchExemption

\{ `reason`: `string`; \} \| `undefined`

## Returns

`string` \| `null`
