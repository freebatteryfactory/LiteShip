[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / MutantTestRunner

# Type Alias: MutantTestRunner

> **MutantTestRunner** = (`mutatedSource`, `coveringTests`) => `object`

Defined in: [audit/src/mutation-verdict.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L58)

The injected test runner — run `coveringTests` against `mutatedSource` and report
whether ANY of them FAILED. `failed: true` ⇒ at least one covering test caught the
mutation (the mutant is killed). Pure w.r.t. its inputs in the stub; the
production runner is effectful (spawns vitest) but its CONTRACT is the same
boolean. It receives the FULL mutated source (so the production runner can write
it to a temp file and run the suite) and the covering test ids (so it runs only
the relevant subset).

## Parameters

### mutatedSource

`string`

### coveringTests

readonly `string`[]

## Returns

`object`

### failed

> `readonly` **failed**: `boolean`
