[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / requireIR

# Function: requireIR()

> **requireIR**(`context`, `gateId`): [`RepoIR`](../interfaces/RepoIR.md)

Defined in: [gauntlet/src/gate.ts:734](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L734)

Read the injected [RepoIR](../interfaces/RepoIR.md) from a context, or throw a clear tagged
[HostCapabilityError](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts) when none was injected — the guard an IR-fold gate
uses so the lean engine's optional `ir` fails LOUD (never silently no-ops a
gate whose whole job is the IR). `gateId` is woven into the error for
traceability.

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### gateId

`string`

## Returns

[`RepoIR`](../interfaces/RepoIR.md)
