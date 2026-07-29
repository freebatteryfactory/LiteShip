[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/evidence](../README.md) / ChainValidationError

# Type Alias: ChainValidationError

> **ChainValidationError** = \{ `index`: `0`; `type`: `"not_genesis"`; \} \| \{ `computed`: `string`; `index`: `number`; `stored`: `string`; `type`: `"hash_mismatch"`; \} \| \{ `actual`: `string`; `expected`: `string`; `index`: `number`; `type`: `"chain_break"`; \} \| \{ `index`: `number`; `type`: `"hlc_not_increasing"`; \} \| \{ `reason`: `string`; `type`: `"checkpoint_invalid"`; \}

Defined in: core/dist/evidence/receipt.d.ts:37

Structured failure returned by `Receipt.validateChainDetailed`.
