[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / WallClockTimestamp

# Type Alias: WallClockTimestamp

> **WallClockTimestamp** = `string`

Defined in: [\_spine/command.d.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L18)

A volatile wall-clock timestamp (CUT B2): an ISO-8601 string stamped at the
moment a result/receipt is produced. It is **identity-irrelevant** — excluded
from `resultId` (idempotency) and never used for causal ordering. It is NOT an
`HLC` (the causal, monotonic, hash/chain-relevant clock). Use
this alias for every volatile command/result timestamp so the contract is
visible at the type level without a breaking field rename.
