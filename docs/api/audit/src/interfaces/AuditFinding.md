[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / AuditFinding

# Interface: AuditFinding

Defined in: [audit/src/types.ts:110](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L110)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [audit/src/types.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L111)

***

### location?

> `readonly` `optional` **location?**: [`AuditLocation`](AuditLocation.md)

Defined in: [audit/src/types.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L117)

***

### metadata?

> `readonly` `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [audit/src/types.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L118)

***

### rule

> `readonly` **rule**: `"console-call"` \| `"consumer-package-missing"` \| `"default-export"` \| `"export-target-missing"` \| `"fallback-laundering"` \| `"host-surface"` \| `"missing-manifest-dependency"` \| `"missing-manifest-dependency-dynamic"` \| `"missing-runtime-capability"` \| `"no-packages-discovered"` \| `"orphan-export-candidate"` \| `"package-export-surface"` \| `"package-artifacts-unverified"` \| `"package-topology"` \| `"placeholder-content"` \| `"stub-marker"` \| `"suspicious-reimplementation"` \| `"symbol-orphan-candidate"` \| `"unknown-internal-package"` \| `"unresolved-internal-import"` \| `"virtual-module-surface"`

Defined in: [audit/src/types.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L113)

***

### section

> `readonly` **section**: [`AuditSection`](../type-aliases/AuditSection.md) \| `"support"`

Defined in: [audit/src/types.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L112)

***

### severity

> `readonly` **severity**: [`AuditSeverity`](../type-aliases/AuditSeverity.md)

Defined in: [audit/src/types.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L114)

***

### summary

> `readonly` **summary**: `string`

Defined in: [audit/src/types.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L116)

***

### title

> `readonly` **title**: `string`

Defined in: [audit/src/types.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L115)
