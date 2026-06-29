[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / DevopsProfile

# Interface: DevopsProfile

Defined in: [audit/src/devops-profile.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L55)

The devops profile that drives the audit engine. `repoRoot` is the single
AUTHORITATIVE audit target (CUT D9a) — there is no parallel `root` parameter.

## Properties

### dynamicImportExemptions

> `readonly` **dynamicImportExemptions**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/devops-profile.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L70)

Sanctioned manifest-absent dynamic edges (`"<importer> -> <target>"`).

***

### foundationalPackages?

> `readonly` `optional` **foundationalPackages?**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L68)

Foundational packages every package may import without an explicit
`allowedInternalImports` entry (the runtime analogue of `@czap/_spine`).
Optional: absent ⇒ no foundational exemptions (every internal edge must be
listed). Downstream profiles may set their own.

***

### internalPackagePrefix

> `readonly` **internalPackagePrefix**: `string`

Defined in: [audit/src/devops-profile.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L59)

Internal workspace package prefix — replaces the hardcoded `'@czap/'` import gate.

***

### packageRoots?

> `readonly` `optional` **packageRoots?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/devops-profile.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L80)

Optional explicit package-root map: package name → ABSOLUTE package dir.
When present, the passes enumerate THESE roots instead of globbing
`repoRoot/packages/*` — the consumer-install seam. Build one with
`consumerDevopsProfile()` / `discoverInstalledPackageRoots()` to audit
the `@czap/*` packages installed in a downstream repo's node_modules.

***

### packageTopology

> `readonly` **packageTopology**: `Record`\<`string`, [`PackagePolicy`](PackagePolicy.md)\>

Defined in: [audit/src/devops-profile.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L61)

Package layering law: package → { allowedInternalImports, kind }.

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [audit/src/devops-profile.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L57)

Repo root all engine paths resolve against — the authoritative audit target.

***

### surfacePolicy

> `readonly` **surfacePolicy**: [`SurfacePolicyShape`](SurfacePolicyShape.md)

Defined in: [audit/src/devops-profile.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L72)

Known public-surface files (orphan-detection seed).
