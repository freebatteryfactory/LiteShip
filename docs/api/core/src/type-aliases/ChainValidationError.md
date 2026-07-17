[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ChainValidationError

# Type Alias: ChainValidationError

> **ChainValidationError** = \{ `index`: `0`; `type`: `"not_genesis"`; \} \| \{ `computed`: `string`; `index`: `number`; `stored`: `string`; `type`: `"hash_mismatch"`; \} \| \{ `actual`: `string`; `expected`: `string`; `index`: `number`; `type`: `"chain_break"`; \} \| \{ `index`: `number`; `type`: `"hlc_not_increasing"`; \} \| \{ `reason`: `string`; `type`: `"checkpoint_invalid"`; \}

Defined in: [core/src/receipt.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L43)

Structured failure returned by `Receipt.validateChainDetailed`.
