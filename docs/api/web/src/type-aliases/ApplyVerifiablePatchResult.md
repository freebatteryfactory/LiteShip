[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ApplyVerifiablePatchResult

# Type Alias: ApplyVerifiablePatchResult

> **ApplyVerifiablePatchResult** = \{ `_tag`: `"applied"`; `envelope`: [`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md); `rung`: [`DpuRung`](DpuRung.md); \} \| \{ `_tag`: `"refused"`; `verification`: `Exclude`\<[`VerifiablePatchVerification`](VerifiablePatchVerification.md), \{ `_tag`: `"verified"`; \}\>; \}

Defined in: [web/src/dpu/watch-and-prepare.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L57)

Outcome of applying a verifiable patch (applied or refused).
