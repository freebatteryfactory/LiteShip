[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / AuditSectionResult

# Interface: AuditSectionResult\<TSummary\>

Defined in: [audit/src/types.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L131)

Result envelope shared by every audit pass.

## Type Parameters

### TSummary

`TSummary`

## Properties

### findings

> `readonly` **findings**: readonly [`AuditFinding`](AuditFinding.md)[]

Defined in: [audit/src/types.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L134)

***

### section

> `readonly` **section**: [`AuditSection`](../type-aliases/AuditSection.md)

Defined in: [audit/src/types.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L132)

***

### summary

> `readonly` **summary**: `TSummary`

Defined in: [audit/src/types.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L133)

***

### suppressed

> `readonly` **suppressed**: readonly [`AuditSuppression`](AuditSuppression.md)[]

Defined in: [audit/src/types.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L135)
