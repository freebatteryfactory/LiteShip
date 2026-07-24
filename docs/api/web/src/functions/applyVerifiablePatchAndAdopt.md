[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / applyVerifiablePatchAndAdopt

# Function: applyVerifiablePatchAndAdopt()

> **applyVerifiablePatchAndAdopt**(`target`, `envelope`, `currentBaseGraphId`, `adoptClient`, `resultGraph`, `capability?`): [`ApplyVerifiablePatchAdoptResult`](../type-aliases/ApplyVerifiablePatchAdoptResult.md)

Defined in: [web/src/dpu/watch-and-prepare.ts:235](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L235)

Apply a verified DPU patch and adopt the result graph under the host mutation client.
Refuses when `resultGraph.id` does not match `envelope.resultGraphId`.

## Parameters

### target

`Element`

### envelope

[`VerifiablePatchEnvelope`](../interfaces/VerifiablePatchEnvelope.md)

### currentBaseGraphId

`ContentAddress`

### adoptClient

[`DpuAdoptClient`](../interfaces/DpuAdoptClient.md)

### resultGraph

[`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts)

### capability?

[`DpuCapability`](../type-aliases/DpuCapability.md) = `...`

## Returns

[`ApplyVerifiablePatchAdoptResult`](../type-aliases/ApplyVerifiablePatchAdoptResult.md)
