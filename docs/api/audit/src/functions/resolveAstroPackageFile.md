[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / resolveAstroPackageFile

# Function: resolveAstroPackageFile()

> **resolveAstroPackageFile**(`root`, `astroPackageDir`, `file`): `string`

Defined in: [audit/src/surface.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/surface.ts#L67)

Resolve a profile-listed astro file against the astro PACKAGE root, so the
check holds wherever the package lives (the monorepo workspace layout or a
consumer install under node_modules). Entries starting with `packages/`
are legacy repo-root-relative profile data and resolve against `root`.

## Parameters

### root

`string`

### astroPackageDir

`string`

### file

`string`

## Returns

`string`
