[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / MutationBuildOptions

# Interface: MutationBuildOptions

Defined in: [audit/src/mutation-facts-build.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-facts-build.ts#L42)

Options for [buildMutationFacts](../functions/buildMutationFacts.md) — the host-injection surface.

## Properties

### budget?

> `readonly` `optional` **budget?**: `number`

Defined in: [audit/src/mutation-facts-build.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-facts-build.ts#L54)

Per-file mutant BUDGET cap (the seeded deterministic sample). Omitted → the full
catalogue (the L4 cannon). A production run over many files passes a budget to
bound the suite-runs-per-file.

***

### cache?

> `readonly` `optional` **cache?**: [`MutantVerdictCache`](MutantVerdictCache.md)

Defined in: [audit/src/mutation-facts-build.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-facts-build.ts#L56)

The B2 verdict cache (changed-only-cost) — threaded straight to evaluateMutant.

***

### coverage

> `readonly` **coverage**: [`CoverageMap`](CoverageMap.md)

Defined in: [audit/src/mutation-facts-build.ts:46](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-facts-build.ts#L46)

The deterministic covering-tests map ((file,line) → sorted test ids).

***

### equivalents?

> `readonly` `optional` **equivalents?**: [`EquivalentMutantRegistry`](EquivalentMutantRegistry.md)

Defined in: [audit/src/mutation-facts-build.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-facts-build.ts#L65)

The injected equivalent-mutant registry (the committed, content-addressed
`mutation-equivalents.json`). A mutant whose content address it matches is
recorded `equivalent` (excluded from the survivor work-list + the score
denominator). Omitted → no mutant is treated as equivalent.

***

### runner

> `readonly` **runner**: [`MutantTestRunner`](../type-aliases/MutantTestRunner.md)

Defined in: [audit/src/mutation-facts-build.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-facts-build.ts#L44)

The injected test runner (production vitest; the meta-proof's stub).

***

### scoreBaseline?

> `readonly` `optional` **scoreBaseline?**: `Readonly`\<`Record`\<`string`, `number`\>\>

Defined in: [audit/src/mutation-facts-build.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-facts-build.ts#L48)

The committed per-file score baseline (the ratchet artifact). Empty → no ratchet.

***

### toolchainDigest?

> `readonly` `optional` **toolchainDigest?**: `string`

Defined in: [audit/src/mutation-facts-build.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-facts-build.ts#L58)

The toolchain digest the verdict cache keys against (required iff `cache`).
