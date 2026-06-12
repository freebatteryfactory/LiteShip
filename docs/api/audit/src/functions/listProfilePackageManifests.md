[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / listProfilePackageManifests

# Function: listProfilePackageManifests()

> **listProfilePackageManifests**(`profile`): readonly [`PackageManifestInfo`](../interfaces/PackageManifestInfo.md)[]

Defined in: [audit/src/shared.ts:114](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/shared.ts#L114)

Profile-aware package discovery: with `profile.packageRoots`, enumerate
exactly those roots (the consumer-install seam — packages live under
node_modules, not `repoRoot/packages/*`); otherwise delegate to the
legacy monorepo glob, byte-identical to before.

## Parameters

### profile

[`DevopsProfile`](../interfaces/DevopsProfile.md)

## Returns

readonly [`PackageManifestInfo`](../interfaces/PackageManifestInfo.md)[]
