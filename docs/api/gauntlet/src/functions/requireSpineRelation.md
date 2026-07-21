[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / requireSpineRelation

# Function: requireSpineRelation()

> **requireSpineRelation**(`context`, `gateId`): [`SpineRelationFacts`](../interfaces/SpineRelationFacts.md)

Defined in: [gauntlet/src/gate.ts:1006](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1006)

Read the injected [SpineRelationFacts](../interfaces/SpineRelationFacts.md) from a context, or throw a clear tagged
[HostCapabilityError](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts) when none were injected — the guard the
[spineRelationGate](../variables/spineRelationGate.md) uses so the lean engine's optional `spineRelation` fails
LOUD (never silently no-ops the gate whose whole job is the spine-relation facts).
`gateId` is woven into the error for traceability. The same shape as
[requireTransition](requireTransition.md).

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### gateId

`string`

## Returns

[`SpineRelationFacts`](../interfaces/SpineRelationFacts.md)
