[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / TEST\_ROOTS

# Variable: TEST\_ROOTS

> `const` **TEST\_ROOTS**: `ReadonlySet`\<`string`\>

Defined in: [gauntlet/src/gates/early-return-detect.ts:15](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/early-return-detect.ts#L15)

THE CLASS RULE — ANCHOR: the closed runner vocabulary. ALLOWLIST: roots that
declare an individual test are eligible for early-return findings; roots that
declare a suite are capability-grouping scopes and are not. Skip detection
deliberately consumes the union, because a skipped suite is still a skip.
