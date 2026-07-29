[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / ApplyVerifiablePatchAdoptResult

# Type Alias: ApplyVerifiablePatchAdoptResult

> **ApplyVerifiablePatchAdoptResult** = `Extract`\<[`ApplyVerifiablePatchResult`](ApplyVerifiablePatchResult.md), \{ `_tag`: `"applied"`; \}\> \| `Exclude`\<[`ApplyVerifiablePatchResult`](ApplyVerifiablePatchResult.md), \{ `_tag`: `"applied"`; \}\> \| \{ `_tag`: `"refused"`; `verification`: \{ `_tag`: `"resultGraphMismatch"`; `expected`: [`ContentAddress`](../../schema/type-aliases/ContentAddress.md); `received`: [`ContentAddress`](../../schema/type-aliases/ContentAddress.md); \}; \}

Defined in: web/dist/watch-and-prepare.d.ts:122

Outcome of [applyVerifiablePatchAndAdopt](../functions/applyVerifiablePatchAndAdopt.md) — patch apply plus graph adoption.
