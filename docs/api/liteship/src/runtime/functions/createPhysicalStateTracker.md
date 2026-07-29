[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / createPhysicalStateTracker

# Function: createPhysicalStateTracker()

> **createPhysicalStateTracker**(`ownerDocument`): [`PhysicalStateTracker`](../interfaces/PhysicalStateTracker.md)

Defined in: web/dist/physical/capture.d.ts:28

Install document-level IME tracking under one explicit async-uniform owner.
Separate trackers never share mutable state; disposing one cannot disable a
sibling owned by another host.

## Parameters

### ownerDocument

`Document`

## Returns

[`PhysicalStateTracker`](../interfaces/PhysicalStateTracker.md)
