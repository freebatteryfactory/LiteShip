[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / withRepoRoot

# Function: withRepoRoot()

> **withRepoRoot**(`profile`, `repoRoot`): [`DevopsProfile`](../interfaces/DevopsProfile.md)

Defined in: [audit/src/devops-profile.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L64)

Derive a profile pointed at a different repo root (CUT D9a). `repoRoot` is the
single source of the audit target — the engines read `profile.repoRoot`, never
a parallel `root` param. A caller (or test) that wants to audit another tree
constructs a profile with this helper rather than passing a second argument
that would silently shadow the profile's own root.

## Parameters

### profile

[`DevopsProfile`](../interfaces/DevopsProfile.md)

### repoRoot

`string`

## Returns

[`DevopsProfile`](../interfaces/DevopsProfile.md)
