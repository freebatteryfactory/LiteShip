[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / AuditSuppression

# Interface: AuditSuppression

Defined in: [audit/src/types.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L117)

One finding suppressed by explicit host policy with its reason.

## Properties

### finding

> `readonly` **finding**: [`AuditFinding`](AuditFinding.md)

Defined in: [audit/src/types.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L120)

***

### reason

> `readonly` **reason**: `string`

Defined in: [audit/src/types.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L119)

***

### rule

> `readonly` **rule**: `"console-call"` \| `"consumer-package-missing"` \| `"default-export"` \| `"export-target-missing"` \| `"fallback-laundering"` \| `"host-surface"` \| `"missing-manifest-dependency"` \| `"missing-manifest-dependency-dynamic"` \| `"missing-runtime-capability"` \| `"no-packages-discovered"` \| `"orphan-export-candidate"` \| `"package-export-surface"` \| `"package-artifacts-unverified"` \| `"package-topology"` \| `"placeholder-content"` \| `"stub-marker"` \| `"suspicious-reimplementation"` \| `"symbol-orphan-candidate"` \| `"unknown-internal-package"` \| `"unresolved-internal-import"` \| `"virtual-module-surface"`

Defined in: [audit/src/types.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L118)
