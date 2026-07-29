[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / applyVerifiablePatch

# Function: applyVerifiablePatch()

> **applyVerifiablePatch**(`target`, `envelope`, `currentBaseGraphId`, `capability?`): [`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

Defined in: web/dist/watch-and-prepare.d.ts:116

Apply a verified envelope to `target`, using native DPU when available or the floor path.

## Parameters

### target

`Element`

### envelope

[`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md)

### currentBaseGraphId

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

### capability?

[`DpuCapability`](../type-aliases/DpuCapability.md)

## Returns

[`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)
