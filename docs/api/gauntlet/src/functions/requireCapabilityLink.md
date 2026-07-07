[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / requireCapabilityLink

# Function: requireCapabilityLink()

> **requireCapabilityLink**(`context`, `gateId`): [`CapabilityLinkFacts`](../interfaces/CapabilityLinkFacts.md)

Defined in: [gauntlet/src/gate.ts:867](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L867)

Read the injected [CapabilityLinkFacts](../interfaces/CapabilityLinkFacts.md) from a context, or throw a clear tagged
[HostCapabilityError](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts) (never silently no-ops the gate whose whole job is the capability-link
dataflow proof). The same shape as [requireTaint](requireTaint.md).

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### gateId

`string`

## Returns

[`CapabilityLinkFacts`](../interfaces/CapabilityLinkFacts.md)
