[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / TEST\_ROOTS

# Variable: TEST\_ROOTS

> `const` **TEST\_ROOTS**: `ReadonlySet`\<`string`\>

Defined in: gauntlet/dist/gates/early-return-detect.d.ts:12

THE CLASS RULE — ANCHOR: the closed runner vocabulary. ALLOWLIST: roots that
declare an individual test are eligible for early-return findings; roots that
declare a suite are capability-grouping scopes and are not. Skip detection
deliberately consumes the union, because a skipped suite is still a skip.
