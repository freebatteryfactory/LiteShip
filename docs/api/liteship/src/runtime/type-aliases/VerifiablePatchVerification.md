[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / VerifiablePatchVerification

# Type Alias: VerifiablePatchVerification

> **VerifiablePatchVerification** = \{ `_tag`: `"verified"`; \} \| \{ `_tag`: `"staleBase"`; `expected`: [`ContentAddress`](../../schema/type-aliases/ContentAddress.md); `received`: [`ContentAddress`](../../schema/type-aliases/ContentAddress.md); \} \| \{ `_tag`: `"digestMismatch"`; `actual`: `string`; `expected`: `string`; \} \| \{ `_tag`: `"markerMismatch"`; `expected`: `string`; `received`: `string`; \}

Defined in: web/dist/dpu/watch-and-prepare.d.ts:53

Outcome of verifying a stamped patch against the current base graph.
