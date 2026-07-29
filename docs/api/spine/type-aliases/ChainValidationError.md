[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / ChainValidationError

# Type Alias: ChainValidationError

> **ChainValidationError** = \{ `index`: `0`; `type`: `"not_genesis"`; \} \| \{ `computed`: `string`; `index`: `number`; `stored`: `string`; `type`: `"hash_mismatch"`; \} \| \{ `actual`: `string`; `expected`: `string`; `index`: `number`; `type`: `"chain_break"`; \} \| \{ `index`: `number`; `type`: `"hlc_not_increasing"`; \} \| \{ `reason`: `string`; `type`: `"checkpoint_invalid"`; \}

Defined in: [\_spine/core.d.ts:1210](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1210)

Closed reasons a receipt chain can fail structural or cryptographic validation.
