[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / requireMcdc

# Function: requireMcdc()

> **requireMcdc**(`context`, `gateId`): [`McdcFacts`](../interfaces/McdcFacts.md)

Defined in: [gauntlet/src/gate.ts:685](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L685)

Read the injected [McdcFacts](../interfaces/McdcFacts.md) from a context, or throw a clear tagged
[HostCapabilityError](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts) when none were injected — the guard the
[mcdcCoverageGate](../variables/mcdcCoverageGate.md) uses so the lean engine's optional `mcdc` fails LOUD (never
silently no-ops a gate whose whole job is the MC/DC facts). `gateId` is woven into the
error for traceability. The same shape as [requireMutation](requireMutation.md).

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### gateId

`string`

## Returns

[`McdcFacts`](../interfaces/McdcFacts.md)
