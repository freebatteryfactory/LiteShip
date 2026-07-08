[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / applyVerifiablePatch

# Function: applyVerifiablePatch()

> **applyVerifiablePatch**(`target`, `envelope`, `currentBaseGraphId`, `capability?`): [`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

Defined in: [web/src/dpu/watch-and-prepare.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L174)

Apply a verified envelope to `target`, using native DPU when available or the floor path.

## Parameters

### target

`Element`

### envelope

[`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md)

### currentBaseGraphId

`ContentAddress`

### capability?

[`DpuCapability`](../type-aliases/DpuCapability.md) = `...`

## Returns

[`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)
