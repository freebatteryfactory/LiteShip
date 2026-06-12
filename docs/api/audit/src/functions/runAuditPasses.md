[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / runAuditPasses

# Function: runAuditPasses()

> **runAuditPasses**(`profile?`): [`AuditPassResult`](../interfaces/AuditPassResult.md)

Defined in: [audit/src/index.ts:96](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L96)

Run all three engine passes against a profile and merge their findings. This
is the reusable, repo-agnostic audit — it does NOT compute the LiteShip HICP
score, verify artifacts, or render reports (those compose this in scripts/).

Accepts a PARTIAL profile: omitted fields take the documented defaults of
[resolveDevopsProfile](resolveDevopsProfile.md), so `runAuditPasses({ repoRoot })` just works.
With no argument at all, the full LiteShip reference profile applies.

## Parameters

### profile?

`Partial`\<[`DevopsProfile`](../interfaces/DevopsProfile.md)\> = `liteshipDevopsProfile`

## Returns

[`AuditPassResult`](../interfaces/AuditPassResult.md)
