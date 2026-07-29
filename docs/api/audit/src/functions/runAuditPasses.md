[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / runAuditPasses

# Function: runAuditPasses()

> **runAuditPasses**(`profile`): [`AuditPassResult`](../interfaces/AuditPassResult.md)

Defined in: [audit/src/index.ts:178](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/index.ts#L178)

Run all three engine passes against a profile and merge their findings. This
is the reusable, repo-agnostic audit — it does NOT compute the LiteShip HICP
score, verify artifacts, or render reports (those compose this in scripts/).

Accepts a PARTIAL profile: omitted fields take the documented defaults of
[resolveDevopsProfile](resolveDevopsProfile.md), so `runAuditPasses({ repoRoot })` just works.
The host must supply at least its repository root; no project policy is
inherited from the reusable engine.

## Parameters

### profile

`Partial`\<[`DevopsProfile`](../interfaces/DevopsProfile.md)\>

## Returns

[`AuditPassResult`](../interfaces/AuditPassResult.md)
