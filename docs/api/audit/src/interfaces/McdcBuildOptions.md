[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / McdcBuildOptions

# Interface: McdcBuildOptions

Defined in: [audit/src/mcdc-facts-build.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L45)

Options for [buildMcdcFacts](../functions/buildMcdcFacts.md) — the host-injection surface (mirrors the mutation builder).

## Properties

### cache?

> `readonly` `optional` **cache?**: [`MutantVerdictCache`](MutantVerdictCache.md)

Defined in: [audit/src/mcdc-facts-build.ts:51](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L51)

The B2 verdict cache (changed-only-cost) — threaded straight to evaluateMutant.

***

### coverage

> `readonly` **coverage**: [`CoverageMap`](CoverageMap.md)

Defined in: [audit/src/mcdc-facts-build.ts:49](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L49)

The deterministic covering-tests map ((file,line) → sorted test ids).

***

### runner

> `readonly` **runner**: [`MutantTestRunner`](../type-aliases/MutantTestRunner.md)

Defined in: [audit/src/mcdc-facts-build.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L47)

The injected test runner (production vitest; the meta-proof's stub).

***

### toolchainDigest?

> `readonly` `optional` **toolchainDigest?**: `string`

Defined in: [audit/src/mcdc-facts-build.ts:53](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L53)

The toolchain digest the verdict cache keys against (required iff `cache`).
