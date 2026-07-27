[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / applyVerifiablePatchAndAdopt

# Function: applyVerifiablePatchAndAdopt()

> **applyVerifiablePatchAndAdopt**(`target`, `envelope`, `currentBaseGraphId`, `adoptClient`, `resultGraph`, `capability?`): [`ApplyVerifiablePatchAdoptResult`](../type-aliases/ApplyVerifiablePatchAdoptResult.md)

Defined in: web/dist/watch-and-prepare.d.ts:138

Apply a verified DPU patch and adopt the result graph under the host mutation client.
Refuses when `resultGraph.id` does not match `envelope.resultGraphId`.

## Parameters

### target

`Element`

### envelope

[`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md)

### currentBaseGraphId

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

### adoptClient

[`DpuAdoptClient`](../interfaces/DpuAdoptClient.md)

### resultGraph

[`DocumentGraph`](../../graph/interfaces/DocumentGraph.md)

### capability?

[`DpuCapability`](../type-aliases/DpuCapability.md)

## Returns

[`ApplyVerifiablePatchAdoptResult`](../type-aliases/ApplyVerifiablePatchAdoptResult.md)
