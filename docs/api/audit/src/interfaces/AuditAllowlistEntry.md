[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / AuditAllowlistEntry

# Interface: AuditAllowlistEntry

Defined in: [audit/src/policy.ts:16](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L16)

## Properties

### filePrefix?

> `readonly` `optional` **filePrefix?**: `string`

Defined in: [audit/src/policy.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L28)

***

### package?

> `readonly` `optional` **package?**: `string`

Defined in: [audit/src/policy.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L27)

npm package name owning the allowlisted file. When set, `filePrefix` is
PACKAGE-RELATIVE (e.g. `src/client-directives/adaptive.ts`) and matching
resolves the finding's file through the profile's discovered package
roots — so the same entry suppresses in the monorepo
(`packages/astro/...`) and in a consumer install
(`node_modules/.pnpm/.../@liteship/astro/...`). Without it, `filePrefix` is
matched against the repo-root-relative finding path verbatim.

***

### reason

> `readonly` **reason**: `string`

Defined in: [audit/src/policy.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L30)

***

### rule

> `readonly` **rule**: `"console-call"` \| `"consumer-package-missing"` \| `"default-export"` \| `"export-target-missing"` \| `"fallback-laundering"` \| `"host-surface"` \| `"missing-manifest-dependency"` \| `"missing-manifest-dependency-dynamic"` \| `"missing-runtime-capability"` \| `"no-packages-discovered"` \| `"orphan-export-candidate"` \| `"package-export-surface"` \| `"package-artifacts-unverified"` \| `"package-topology"` \| `"placeholder-content"` \| `"stub-marker"` \| `"suspicious-reimplementation"` \| `"symbol-orphan-candidate"` \| `"unknown-internal-package"` \| `"unresolved-internal-import"` \| `"virtual-module-surface"`

Defined in: [audit/src/policy.ts:17](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L17)

***

### summaryIncludes?

> `readonly` `optional` **summaryIncludes?**: `string`

Defined in: [audit/src/policy.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L29)
