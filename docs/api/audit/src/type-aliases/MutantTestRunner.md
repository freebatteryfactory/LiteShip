[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / MutantTestRunner

# Type Alias: MutantTestRunner

> **MutantTestRunner** = (`mutatedSource`, `coveringTests`) => `object`

Defined in: [audit/src/mutation-verdict.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L63)

The injected test runner — run `coveringTests` against `mutatedSource` and report
whether ANY of them FAILED. `failed: true` ⇒ at least one covering test caught the
mutation (the mutant is killed). Pure w.r.t. its inputs in the stub; the
production runner is effectful (spawns vitest) but its CONTRACT is the same
boolean. It receives the FULL mutated source (so the production runner can write
it to a temp file and run the suite) and the covering test ids (so it runs only
the relevant subset).

THROWING CONTRACT: a throw carrying `campaignFatal: true` names non-recoverable
state (the runner could not restore the original bytes) and aborts the whole
campaign; ANY other throw is a per-mutant refusal to mint a false verdict and
folds into an `inconclusive` verdict — recorded fail-closed, campaign continues.

## Parameters

### mutatedSource

`string`

### coveringTests

readonly `string`[]

## Returns

`object`

### failed

> `readonly` **failed**: `boolean`
