[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / resolveDevopsProfile

# Function: resolveDevopsProfile()

> **resolveDevopsProfile**(`partial`): [`DevopsProfile`](../interfaces/DevopsProfile.md)

Defined in: [audit/src/devops-profile.ts:147](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L147)

Resolve a PARTIAL profile into a full [DevopsProfile](../interfaces/DevopsProfile.md) with documented
defaults, so `runAuditPasses({ repoRoot })` just works:

  • `repoRoot`                 → the current working directory
  • `packageTopology`          → `{}` (coverage classifies as policy-absent)
  • `dynamicImportExemptions`  → empty set (no sanctioned dynamic edges)
  • `surfacePolicy`            → `{}` (no host-surface assumptions)
  • `internalPackagePrefix`    → derived from the single common npm scope of
    the discovered package manifests; ambiguous or unscoped trees throw a
    teaching error instead of guessing.

ADR-0012 pins WHICH fields a profile has, not that callers must hand-build
them; a fully-specified profile passes through unchanged (modulo repo-path
normalization).

## Parameters

### partial

`Partial`\<[`DevopsProfile`](../interfaces/DevopsProfile.md)\>

## Returns

[`DevopsProfile`](../interfaces/DevopsProfile.md)
