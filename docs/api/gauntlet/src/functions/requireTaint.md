[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / requireTaint

# Function: requireTaint()

> **requireTaint**(`context`, `gateId`): [`TaintFacts`](../interfaces/TaintFacts.md)

Defined in: [gauntlet/src/gate.ts:852](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L852)

Read the injected [TaintFacts](../interfaces/TaintFacts.md) from a context, or throw a clear tagged
[HostCapabilityError](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts) when none were injected — the guard the
[taintFlowGate](../variables/taintFlowGate.md) uses so the lean engine's optional `taint` fails LOUD
(never silently no-ops a gate whose whole job is the taint dataflow facts).
`gateId` is woven into the error for traceability. The same shape as
[requireMutation](requireMutation.md) / [requireMcdc](requireMcdc.md).

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### gateId

`string`

## Returns

[`TaintFacts`](../interfaces/TaintFacts.md)
