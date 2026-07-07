[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / requireMutation

# Function: requireMutation()

> **requireMutation**(`context`, `gateId`): [`MutationFacts`](../interfaces/MutationFacts.md)

Defined in: [gauntlet/src/gate.ts:817](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L817)

Read the injected [MutationFacts](../interfaces/MutationFacts.md) from a context, or throw a clear tagged
[HostCapabilityError](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts) when none was injected — the guard the
[mutationDivergenceGate](../variables/mutationDivergenceGate.md) uses so the lean engine's optional `mutation`
fails LOUD (never silently no-ops a gate whose whole job is the mutation facts).
`gateId` is woven into the error for traceability. The same shape as
[requireIR](requireIR.md).

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### gateId

`string`

## Returns

[`MutationFacts`](../interfaces/MutationFacts.md)
