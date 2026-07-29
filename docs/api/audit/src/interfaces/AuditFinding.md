[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / AuditFinding

# Interface: AuditFinding

Defined in: [audit/src/types.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L118)

One stable, machine-readable audit observation.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [audit/src/types.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L119)

***

### location?

> `readonly` `optional` **location?**: [`AuditLocation`](AuditLocation.md)

Defined in: [audit/src/types.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L125)

***

### metadata?

> `readonly` `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [audit/src/types.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L126)

***

### rule

> `readonly` **rule**: `"console-call"` \| `"consumer-package-missing"` \| `"default-export"` \| `"export-target-missing"` \| `"fallback-laundering"` \| `"host-surface"` \| `"missing-manifest-dependency"` \| `"missing-manifest-dependency-dynamic"` \| `"missing-runtime-capability"` \| `"no-packages-discovered"` \| `"orphan-export-candidate"` \| `"package-export-surface"` \| `"package-artifacts-unverified"` \| `"package-topology"` \| `"placeholder-content"` \| `"stub-marker"` \| `"suspicious-reimplementation"` \| `"symbol-orphan-candidate"` \| `"unknown-internal-package"` \| `"unresolved-internal-import"` \| `"virtual-module-surface"`

Defined in: [audit/src/types.ts:121](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L121)

***

### section

> `readonly` **section**: [`AuditSection`](../type-aliases/AuditSection.md) \| `"support"`

Defined in: [audit/src/types.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L120)

***

### severity

> `readonly` **severity**: [`AuditSeverity`](../type-aliases/AuditSeverity.md)

Defined in: [audit/src/types.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L122)

***

### summary

> `readonly` **summary**: `string`

Defined in: [audit/src/types.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L124)

***

### title

> `readonly` **title**: `string`

Defined in: [audit/src/types.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L123)
