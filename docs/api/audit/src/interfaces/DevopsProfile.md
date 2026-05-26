[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / DevopsProfile

# Interface: DevopsProfile

Defined in: [audit/src/devops-profile.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L30)

The devops profile that drives the audit engine. `repoRoot` is the single
AUTHORITATIVE audit target (CUT D9a) — there is no parallel `root` parameter.

## Properties

### dynamicImportExemptions

> `readonly` **dynamicImportExemptions**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/devops-profile.ts:38](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L38)

Sanctioned manifest-absent dynamic edges (`"<importer> -> <target>"`).

***

### internalPackagePrefix

> `readonly` **internalPackagePrefix**: `string`

Defined in: [audit/src/devops-profile.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L34)

Internal workspace package prefix — replaces the hardcoded `'@czap/'` import gate.

***

### packageTopology

> `readonly` **packageTopology**: `Record`\<`string`, [`PackagePolicy`](PackagePolicy.md)\>

Defined in: [audit/src/devops-profile.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L36)

Package layering law: package → { allowedInternalImports, kind }.

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [audit/src/devops-profile.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L32)

Repo root all engine paths resolve against — the authoritative audit target.

***

### surfacePolicy

> `readonly` **surfacePolicy**: [`SurfacePolicyShape`](SurfacePolicyShape.md)

Defined in: [audit/src/devops-profile.ts:40](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L40)

Known public-surface files (orphan-detection seed).
