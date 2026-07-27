[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / createPhysicalStateTracker

# Function: createPhysicalStateTracker()

> **createPhysicalStateTracker**(`ownerDocument`): [`PhysicalStateTracker`](../interfaces/PhysicalStateTracker.md)

Defined in: [web/src/physical/capture.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/physical/capture.ts#L50)

Install document-level IME tracking under one explicit async-uniform owner.
Separate trackers never share mutable state; disposing one cannot disable a
sibling owned by another host.

## Parameters

### ownerDocument

`Document`

## Returns

[`PhysicalStateTracker`](../interfaces/PhysicalStateTracker.md)
