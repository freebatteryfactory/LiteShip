[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / McdcBuildOptions

# Interface: McdcBuildOptions

Defined in: [audit/src/mcdc-facts-build.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L48)

Options for [buildMcdcFacts](../functions/buildMcdcFacts.md) — the host-injection surface (mirrors the mutation builder).

## Properties

### cache?

> `readonly` `optional` **cache?**: [`MutantVerdictCache`](MutantVerdictCache.md)

Defined in: [audit/src/mcdc-facts-build.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L54)

The B2 verdict cache (changed-only-cost) — threaded straight to evaluateMutant.

***

### coverage

> `readonly` **coverage**: [`CoverageMap`](CoverageMap.md)

Defined in: [audit/src/mcdc-facts-build.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L52)

The deterministic covering-tests map ((file,line) → sorted test ids).

***

### runner

> `readonly` **runner**: [`MutantTestRunner`](../type-aliases/MutantTestRunner.md)

Defined in: [audit/src/mcdc-facts-build.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L50)

The injected test runner (production vitest; the meta-proof's stub).

***

### toolchainDigest?

> `readonly` `optional` **toolchainDigest?**: `string`

Defined in: [audit/src/mcdc-facts-build.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L56)

The toolchain digest the verdict cache keys against (required iff `cache`).
