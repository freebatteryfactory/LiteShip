[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / createPackagePathResolver

# Function: createPackagePathResolver()

> **createPackagePathResolver**(`profile`): [`PackagePathResolver`](../type-aliases/PackagePathResolver.md)

Defined in: [audit/src/shared.ts:232](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/shared.ts#L232)

Map repo-relative finding paths to their owning package via the profile's
discovered manifests. Monorepo: `packages/astro/src/x.ts` → `@liteship/astro` +
`src/x.ts`. Consumer install: the same file resolves identically from its
`node_modules/.../@liteship/astro` root, so package-relative allowlist entries
suppress in both layouts. Longest root wins (pnpm virtual-store roots nest
under `node_modules/.pnpm/...`).

## Parameters

### profile

[`DevopsProfile`](../interfaces/DevopsProfile.md)

## Returns

[`PackagePathResolver`](../type-aliases/PackagePathResolver.md)
