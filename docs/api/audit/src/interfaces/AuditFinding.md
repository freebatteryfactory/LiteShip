[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / AuditFinding

# Interface: AuditFinding

Defined in: [audit/src/types.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L105)

One stable, machine-readable audit observation.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [audit/src/types.ts:106](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L106)

***

### location?

> `readonly` `optional` **location?**: [`AuditLocation`](AuditLocation.md)

Defined in: [audit/src/types.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L112)

***

### metadata?

> `readonly` `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [audit/src/types.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L113)

***

### rule

> `readonly` **rule**: `"console-call"` \| `"consumer-package-missing"` \| `"default-export"` \| `"export-target-missing"` \| `"fallback-laundering"` \| `"host-surface"` \| `"missing-manifest-dependency"` \| `"missing-manifest-dependency-dynamic"` \| `"missing-runtime-capability"` \| `"no-packages-discovered"` \| `"orphan-export-candidate"` \| `"package-export-surface"` \| `"package-artifacts-unverified"` \| `"package-topology"` \| `"placeholder-content"` \| `"stub-marker"` \| `"suspicious-reimplementation"` \| `"symbol-orphan-candidate"` \| `"unknown-internal-package"` \| `"unresolved-internal-import"` \| `"virtual-module-surface"`

Defined in: [audit/src/types.ts:108](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L108)

***

### section

> `readonly` **section**: [`AuditSection`](../type-aliases/AuditSection.md) \| `"support"`

Defined in: [audit/src/types.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L107)

***

### severity

> `readonly` **severity**: [`AuditSeverity`](../type-aliases/AuditSeverity.md)

Defined in: [audit/src/types.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L109)

***

### summary

> `readonly` **summary**: `string`

Defined in: [audit/src/types.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L111)

***

### title

> `readonly` **title**: `string`

Defined in: [audit/src/types.ts:110](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L110)
