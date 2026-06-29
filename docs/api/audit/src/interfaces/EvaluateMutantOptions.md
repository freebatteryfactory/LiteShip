[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / EvaluateMutantOptions

# Interface: EvaluateMutantOptions

Defined in: [audit/src/mutation-verdict.ts:191](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L191)

Options for [evaluateMutant](../functions/evaluateMutant.md) — the injected runner + (optional) cache.

## Properties

### cache?

> `readonly` `optional` **cache?**: [`MutantVerdictCache`](MutantVerdictCache.md)

Defined in: [audit/src/mutation-verdict.ts:203](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L203)

The B2 verdict cache (optional). When present, the verdict is keyed against
`(mutant.id + coveringTestsDigest + toolchainDigest)` and a cache HIT skips the
runner entirely. Omit it → the runner always runs (the uncached path).

***

### coverage

> `readonly` **coverage**: [`CoverageMap`](CoverageMap.md)

Defined in: [audit/src/mutation-verdict.ts:195](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L195)

The deterministic covering-tests mapping.

***

### equivalents?

> `readonly` `optional` **equivalents?**: [`EquivalentMutantRegistry`](EquivalentMutantRegistry.md)

Defined in: [audit/src/mutation-verdict.ts:210](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L210)

The injected EQUIVALENT-MUTANT registry (optional). When present and it matches
the mutant's content address, the verdict is `equivalent` (the runner is NEVER
invoked — there is nothing to test). Omitted → no mutant is treated as equivalent
(every mutant runs the normal kill/survive path).

***

### originalSource

> `readonly` **originalSource**: `string`

Defined in: [audit/src/mutation-verdict.ts:197](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L197)

The original (un-mutated) source the mutant splices into.

***

### runner

> `readonly` **runner**: [`MutantTestRunner`](../type-aliases/MutantTestRunner.md)

Defined in: [audit/src/mutation-verdict.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L193)

The injected test runner (stub in the meta-proof, vitest in production).

***

### toolchainDigest?

> `readonly` `optional` **toolchainDigest?**: `string`

Defined in: [audit/src/mutation-verdict.ts:219](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L219)

The host's toolchain digest (the gauntlet/test-runner build fingerprint) — the
anti-lie keystone of the verdict key, exactly as in the gate-verdict cache. A
runner-logic change → a new toolchain digest → every cached mutant verdict
invalidated even when the mutant + its covering tests are unchanged. REQUIRED
when `cache` is present (a cache without it could serve a verdict from a
different runner — a stale-serve lie).
