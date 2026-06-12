[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / DevopsProfile

# Interface: DevopsProfile

Defined in: [audit/src/devops-profile.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L48)

The devops profile that drives the audit engine. `repoRoot` is the single
AUTHORITATIVE audit target (CUT D9a) — there is no parallel `root` parameter.

## Properties

### dynamicImportExemptions

> `readonly` **dynamicImportExemptions**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/devops-profile.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L56)

Sanctioned manifest-absent dynamic edges (`"<importer> -> <target>"`).

***

### internalPackagePrefix

> `readonly` **internalPackagePrefix**: `string`

Defined in: [audit/src/devops-profile.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L52)

Internal workspace package prefix — replaces the hardcoded `'@czap/'` import gate.

***

### packageRoots?

> `readonly` `optional` **packageRoots?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/devops-profile.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L66)

Optional explicit package-root map: package name → ABSOLUTE package dir.
When present, the passes enumerate THESE roots instead of globbing
`repoRoot/packages/*` — the consumer-install seam. Build one with
`consumerDevopsProfile()` / `discoverInstalledPackageRoots()` to audit
the `@czap/*` packages installed in a downstream repo's node_modules.

***

### packageTopology

> `readonly` **packageTopology**: `Record`\<`string`, [`PackagePolicy`](PackagePolicy.md)\>

Defined in: [audit/src/devops-profile.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L54)

Package layering law: package → { allowedInternalImports, kind }.

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [audit/src/devops-profile.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L50)

Repo root all engine paths resolve against — the authoritative audit target.

***

### surfacePolicy

> `readonly` **surfacePolicy**: [`SurfacePolicyShape`](SurfacePolicyShape.md)

Defined in: [audit/src/devops-profile.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L58)

Known public-surface files (orphan-detection seed).
