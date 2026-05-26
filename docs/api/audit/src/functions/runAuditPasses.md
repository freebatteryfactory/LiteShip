[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / runAuditPasses

# Function: runAuditPasses()

> **runAuditPasses**(`profile?`): [`AuditPassResult`](../interfaces/AuditPassResult.md)

Defined in: [audit/src/index.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/index.ts#L42)

Run all three engine passes against a profile and merge their findings. This
is the reusable, repo-agnostic audit — it does NOT compute the LiteShip HICP
score, verify artifacts, or render reports (those compose this in scripts/).

## Parameters

### profile?

[`DevopsProfile`](../interfaces/DevopsProfile.md) = `liteshipDevopsProfile`

## Returns

[`AuditPassResult`](../interfaces/AuditPassResult.md)
