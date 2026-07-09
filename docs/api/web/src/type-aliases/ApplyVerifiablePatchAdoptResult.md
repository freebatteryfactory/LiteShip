[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ApplyVerifiablePatchAdoptResult

# Type Alias: ApplyVerifiablePatchAdoptResult

> **ApplyVerifiablePatchAdoptResult** = `Extract`\<[`ApplyVerifiablePatchResult`](ApplyVerifiablePatchResult.md), \{ `_tag`: `"applied"`; \}\> \| `Exclude`\<[`ApplyVerifiablePatchResult`](ApplyVerifiablePatchResult.md), \{ `_tag`: `"applied"`; \}\> \| \{ `_tag`: `"refused"`; `verification`: \{ `_tag`: `"resultGraphMismatch"`; `expected`: [`ContentAddress`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/ContentAddress.md); `received`: [`ContentAddress`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/ContentAddress.md); \}; \}

Defined in: [web/src/dpu/watch-and-prepare.ts:219](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L219)

Outcome of [applyVerifiablePatchAndAdopt](../functions/applyVerifiablePatchAndAdopt.md) — patch apply plus graph adoption.
