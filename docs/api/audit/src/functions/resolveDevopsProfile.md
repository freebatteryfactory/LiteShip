[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / resolveDevopsProfile

# Function: resolveDevopsProfile()

> **resolveDevopsProfile**(`partial`): [`DevopsProfile`](../interfaces/DevopsProfile.md)

Defined in: [audit/src/devops-profile.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L150)

Resolve a PARTIAL profile into a full [DevopsProfile](../interfaces/DevopsProfile.md) with documented
defaults, so `runAuditPasses({ repoRoot })` just works:

  • `repoRoot`                 → the current working directory
  • `packageTopology`          → `{}` (coverage classifies as policy-absent)
  • `dynamicImportExemptions`  → empty set (no sanctioned dynamic edges)
  • `surfacePolicy`            → `{}` (no host-surface assumptions)
  • `allowlist`                → `[]` (no hidden project suppression)
  • `internalPackagePrefix`    → derived from the single common npm scope of
    the discovered package manifests; ambiguous or unscoped trees throw a
    teaching error instead of guessing.

The no-aspirational-fields law pins WHICH fields a profile has — only what the
audit actually consumes — not that callers must hand-build them; a fully-specified
profile passes through unchanged (modulo repo-path normalization).

## Parameters

### partial

`Partial`\<[`DevopsProfile`](../interfaces/DevopsProfile.md)\>

## Returns

[`DevopsProfile`](../interfaces/DevopsProfile.md)
