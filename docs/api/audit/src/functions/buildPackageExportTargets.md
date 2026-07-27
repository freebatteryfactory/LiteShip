[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / buildPackageExportTargets

# Function: buildPackageExportTargets()

> **buildPackageExportTargets**(`packageInfos`, `profile?`): [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)\<`string`, [`PackageExportTarget`](../interfaces/PackageExportTarget.md)\>

Defined in: [audit/src/structure.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/structure.ts#L117)

Resolve package export maps into concrete consumer-visible target files.

## Parameters

### packageInfos

readonly [`PackageManifestInfo`](../interfaces/PackageManifestInfo.md)[]

### profile?

`Pick`\<[`DevopsProfile`](../interfaces/DevopsProfile.md), `"repoRoot"` \| `"sourceEntrypoints"` \| `"packageRoots"`\>

## Returns

[`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)\<`string`, [`PackageExportTarget`](../interfaces/PackageExportTarget.md)\>
