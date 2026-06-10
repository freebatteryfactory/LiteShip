[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / partitionAllowlistedFindings

# Function: partitionAllowlistedFindings()

> **partitionAllowlistedFindings**(`findings`, `profile`): `object`

Defined in: [audit/src/shared.ts:237](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/shared.ts#L237)

## Parameters

### findings

readonly [`AuditFinding`](../interfaces/AuditFinding.md)[]

### profile

[`DevopsProfile`](../interfaces/DevopsProfile.md)

## Returns

`object`

### findings

> `readonly` **findings**: [`AuditFinding`](../interfaces/AuditFinding.md)[]

### suppressed

> `readonly` **suppressed**: [`AuditSuppression`](../interfaces/AuditSuppression.md)[]
