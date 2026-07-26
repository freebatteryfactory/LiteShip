[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / applyVerifiablePatch

# Function: applyVerifiablePatch()

> **applyVerifiablePatch**(`target`, `envelope`, `currentBaseGraphId`, `capability?`): [`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

Defined in: web/dist/dpu/watch-and-prepare.d.ts:118

Apply a verified envelope to `target`, using native DPU when available or the floor path.

## Parameters

### target

`Element`

### envelope

[`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md)

### currentBaseGraphId

`ContentAddress`

### capability?

[`DpuCapability`](../type-aliases/DpuCapability.md)

## Returns

[`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)
