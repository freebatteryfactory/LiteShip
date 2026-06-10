[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / AuditAllowlistEntry

# Interface: AuditAllowlistEntry

Defined in: [audit/src/policy.ts:14](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/policy.ts#L14)

## Properties

### filePrefix?

> `readonly` `optional` **filePrefix?**: `string`

Defined in: [audit/src/policy.ts:26](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/policy.ts#L26)

***

### package?

> `readonly` `optional` **package?**: `string`

Defined in: [audit/src/policy.ts:25](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/policy.ts#L25)

npm package name owning the allowlisted file. When set, `filePrefix` is
PACKAGE-RELATIVE (e.g. `src/client-directives/satellite.ts`) and matching
resolves the finding's file through the profile's discovered package
roots — so the same entry suppresses in the monorepo
(`packages/astro/...`) and in a consumer install
(`node_modules/.pnpm/.../@czap/astro/...`). Without it, `filePrefix` is
matched against the repo-root-relative finding path verbatim.

***

### reason

> `readonly` **reason**: `string`

Defined in: [audit/src/policy.ts:28](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/policy.ts#L28)

***

### rule

> `readonly` **rule**: `string`

Defined in: [audit/src/policy.ts:15](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/policy.ts#L15)

***

### summaryIncludes?

> `readonly` `optional` **summaryIncludes?**: `string`

Defined in: [audit/src/policy.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/policy.ts#L27)
