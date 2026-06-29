[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / findAllowlistReason

# Function: findAllowlistReason()

> **findAllowlistReason**(`finding`, `resolvePackagePath?`): `string` \| `null`

Defined in: [audit/src/policy.ts:505](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L505)

Match a finding against the allowlist. Entries carrying `package` need
`resolvePackagePath` to map the finding's repo-relative file to its owning
package — without a resolver those entries can never match (consumer-mode
findings live under node_modules paths the repo-relative prefixes can't
reach, which is exactly the bug package-relative entries fix).

## Parameters

### finding

[`AuditFinding`](../interfaces/AuditFinding.md)

### resolvePackagePath?

[`PackagePathResolver`](../type-aliases/PackagePathResolver.md)

## Returns

`string` \| `null`
