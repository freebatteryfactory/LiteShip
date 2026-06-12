[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / createPackagePathResolver

# Function: createPackagePathResolver()

> **createPackagePathResolver**(`profile`): [`PackagePathResolver`](../type-aliases/PackagePathResolver.md)

Defined in: [audit/src/shared.ts:229](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/shared.ts#L229)

Map repo-relative finding paths to their owning package via the profile's
discovered manifests. Monorepo: `packages/astro/src/x.ts` → `@czap/astro` +
`src/x.ts`. Consumer install: the same file resolves identically from its
`node_modules/.../@czap/astro` root, so package-relative allowlist entries
suppress in both layouts. Longest root wins (pnpm virtual-store roots nest
under `node_modules/.pnpm/...`).

## Parameters

### profile

[`DevopsProfile`](../interfaces/DevopsProfile.md)

## Returns

[`PackagePathResolver`](../type-aliases/PackagePathResolver.md)
