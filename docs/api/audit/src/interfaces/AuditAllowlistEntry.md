[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / AuditAllowlistEntry

# Interface: AuditAllowlistEntry

Defined in: [audit/src/policy.ts:14](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L14)

One host-owned suppression rule with an auditable reason.

## Properties

### filePrefix?

> `readonly` `optional` **filePrefix?**: `string`

Defined in: [audit/src/policy.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L23)

***

### package?

> `readonly` `optional` **package?**: `string`

Defined in: [audit/src/policy.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L22)

Package owning the allowlisted file. When set, `filePrefix` is package
relative and matching requires a profile-derived package path resolver.
Without it, `filePrefix` is repository relative and may never escape the
profile root.

***

### reason

> `readonly` **reason**: `string`

Defined in: [audit/src/policy.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L25)

***

### rule

> `readonly` **rule**: `"console-call"` \| `"consumer-package-missing"` \| `"default-export"` \| `"export-target-missing"` \| `"fallback-laundering"` \| `"host-surface"` \| `"missing-manifest-dependency"` \| `"missing-manifest-dependency-dynamic"` \| `"missing-runtime-capability"` \| `"no-packages-discovered"` \| `"orphan-export-candidate"` \| `"package-export-surface"` \| `"package-artifacts-unverified"` \| `"package-topology"` \| `"placeholder-content"` \| `"stub-marker"` \| `"suspicious-reimplementation"` \| `"symbol-orphan-candidate"` \| `"unknown-internal-package"` \| `"unresolved-internal-import"` \| `"virtual-module-surface"`

Defined in: [audit/src/policy.ts:15](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L15)

***

### summaryIncludes?

> `readonly` `optional` **summaryIncludes?**: `string`

Defined in: [audit/src/policy.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L24)
