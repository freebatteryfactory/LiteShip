[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / requireTransition

# Function: requireTransition()

> **requireTransition**(`context`, `gateId`): [`TransitionFacts`](../interfaces/TransitionFacts.md)

Defined in: [gauntlet/src/gate.ts:984](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L984)

Read the injected [TransitionFacts](../interfaces/TransitionFacts.md) from a context, or throw a clear tagged
[HostCapabilityError](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts) when none were injected — the guard the
[transitionConformanceGate](../variables/transitionConformanceGate.md) uses so the lean engine's optional `transition`
fails LOUD (never silently no-ops a gate whose whole job is the bisimulation facts).
`gateId` is woven into the error for traceability. The same shape as
[requireMutation](requireMutation.md).

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### gateId

`string`

## Returns

[`TransitionFacts`](../interfaces/TransitionFacts.md)
