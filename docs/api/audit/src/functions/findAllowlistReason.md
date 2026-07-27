[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / findAllowlistReason

# Function: findAllowlistReason()

> **findAllowlistReason**(`finding`, `allowlist`, `resolvePackagePath?`): `string` \| `null`

Defined in: [audit/src/policy.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L86)

Match one finding against an explicitly injected allowlist. Package-scoped
entries require the profile's resolver. Repository-relative entries refuse
absolute and traversal paths so a suppression cannot escape its profile.

## Parameters

### finding

[`AuditFinding`](../interfaces/AuditFinding.md)

### allowlist

readonly [`AuditAllowlistEntry`](../interfaces/AuditAllowlistEntry.md)[]

### resolvePackagePath?

[`PackagePathResolver`](../type-aliases/PackagePathResolver.md)

## Returns

`string` \| `null`
