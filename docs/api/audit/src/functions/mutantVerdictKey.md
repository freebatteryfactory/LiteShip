[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / mutantVerdictKey

# Function: mutantVerdictKey()

> **mutantVerdictKey**(`mutant`, `coveringTests`, `toolchainDigest`, `coveringTestDigest?`): `string`

Defined in: [audit/src/mutation-verdict.ts:278](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L278)

The deterministic verdict-cache key for a mutant — `mutant.id` bound to the
digest of its covering tests and the toolchain digest. A change in ANY of the
three flips the key (→ MISS → re-run). The covering-tests digest is a stable fold
over the SORTED test ids (so insertion order never forks the key), routed through
the same `addressedDigestOf` content-addressing the engine uses.

When `coveringTestDigest` is supplied, each sorted entry becomes
`[testId, contentDigest]` — the CONTENT of every covering test joins the key
(PR #194 review, confirmed P1): an assertion edit in a covering test changes
neither the mutated source, the test's path, nor the toolchain build, so a
PERSISTED bank would otherwise keep serving the old `killed` tag and a
weakened test would retain authority it no longer earns. Folding the content
flips the key on any covering-test edit — and ONLY for the mutants that test
covers, so incremental convergence survives. Supply it wherever the cache
outlives one process; an in-run cache may omit it (tests cannot change
mid-run), keeping the legacy key shape.

## Parameters

### mutant

[`MutantCore`](../interfaces/MutantCore.md)

### coveringTests

readonly `string`[]

### toolchainDigest

`string`

### coveringTestDigest?

(`testId`) => `string`

## Returns

`string`
