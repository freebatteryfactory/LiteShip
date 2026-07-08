[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / VerifiablePatchVerification

# Type Alias: VerifiablePatchVerification

> **VerifiablePatchVerification** = \{ `_tag`: `"verified"`; \} \| \{ `_tag`: `"staleBase"`; `expected`: [`ContentAddress`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/ContentAddress.md); `received`: [`ContentAddress`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/ContentAddress.md); \} \| \{ `_tag`: `"digestMismatch"`; `actual`: `string`; `expected`: `string`; \}

Defined in: [web/src/dpu/watch-and-prepare.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L51)

Outcome of verifying a stamped patch against the current base graph.
