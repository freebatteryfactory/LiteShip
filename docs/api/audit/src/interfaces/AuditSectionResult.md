[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / AuditSectionResult

# Interface: AuditSectionResult\<TSummary\>

Defined in: [audit/src/types.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L144)

Result envelope shared by every audit pass.

## Type Parameters

### TSummary

`TSummary`

## Properties

### findings

> `readonly` **findings**: readonly [`AuditFinding`](AuditFinding.md)[]

Defined in: [audit/src/types.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L147)

***

### section

> `readonly` **section**: [`AuditSection`](../type-aliases/AuditSection.md)

Defined in: [audit/src/types.ts:145](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L145)

***

### summary

> `readonly` **summary**: `TSummary`

Defined in: [audit/src/types.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L146)

***

### suppressed

> `readonly` **suppressed**: readonly [`AuditSuppression`](AuditSuppression.md)[]

Defined in: [audit/src/types.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L148)
