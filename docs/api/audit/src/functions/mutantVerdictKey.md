[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / mutantVerdictKey

# Function: mutantVerdictKey()

> **mutantVerdictKey**(`mutant`, `coveringTests`, `toolchainDigest`): `string`

Defined in: [audit/src/mutation-verdict.ts:233](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L233)

The deterministic verdict-cache key for a mutant — `mutant.id` bound to the
digest of its covering tests and the toolchain digest. A change in ANY of the
three flips the key (→ MISS → re-run). The covering-tests digest is a stable fold
over the SORTED test ids (so insertion order never forks the key), routed through
the same `addressedDigestOf` content-addressing the engine uses.

## Parameters

### mutant

[`MutantCore`](../interfaces/MutantCore.md)

### coveringTests

readonly `string`[]

### toolchainDigest

`string`

## Returns

`string`
