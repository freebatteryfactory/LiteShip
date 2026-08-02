[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / SUITE\_ROOTS

# Variable: SUITE\_ROOTS

> `const` **SUITE\_ROOTS**: `ReadonlySet`\<`string`\>

Defined in: gauntlet/dist/gates/early-return-detect.d.ts:14

Runner roots that declare grouping suites rather than individual obligations. Vitest's `bench` is NOT here: it registers an individual benchmark callback, so a premise-guard return inside it is a vacuity finding, not a suite-level capability guard (Codex review on PR #197, confirmed P2).
