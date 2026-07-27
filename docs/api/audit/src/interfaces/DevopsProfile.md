[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / DevopsProfile

# Interface: DevopsProfile

Defined in: [audit/src/devops-profile.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L49)

The devops profile that drives the audit engine. `repoRoot` is the single
AUTHORITATIVE audit target (CUT D9a) — there is no parallel `root` parameter.

## Properties

### allowlist?

> `readonly` `optional` **allowlist?**: readonly [`AuditAllowlistEntry`](AuditAllowlistEntry.md)[]

Defined in: [audit/src/devops-profile.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L68)

Explicit finding suppressions owned by this profile. Absent policy means no suppression.

***

### dynamicImportExemptions

> `readonly` **dynamicImportExemptions**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/devops-profile.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L64)

Sanctioned manifest-absent dynamic edges (`"<importer> -> <target>"`).

***

### foundationalPackages?

> `readonly` `optional` **foundationalPackages?**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L62)

Foundational packages every package may import without an explicit
`allowedInternalImports` entry.
Optional: absent ⇒ no foundational exemptions (every internal edge must be
listed). Downstream profiles may set their own.

***

### internalPackagePrefix

> `readonly` **internalPackagePrefix**: `string`

Defined in: [audit/src/devops-profile.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L53)

Internal workspace package prefix used by the import gate.

***

### packageRoots?

> `readonly` `optional` **packageRoots?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/devops-profile.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L78)

Optional explicit package-root map: package name → ABSOLUTE package dir.
When present, the passes enumerate THESE roots instead of globbing
`repoRoot/packages/*` — the consumer-install seam. Build one with
`consumerDevopsProfile()` / `discoverInstalledPackageRoots()` to audit
the profile's packages installed in a downstream repo's node_modules.

***

### packageTopology

> `readonly` **packageTopology**: `Record`\<`string`, [`PackagePolicy`](PackagePolicy.md)\>

Defined in: [audit/src/devops-profile.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L55)

Package layering law: package → { allowedInternalImports, kind }.

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [audit/src/devops-profile.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L51)

Repo root all engine paths resolve against — the authoritative audit target.

***

### sourceEntrypoints?

> `readonly` `optional` **sourceEntrypoints?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `string`\>\>\>\>

Defined in: [audit/src/devops-profile.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L70)

Host-owned package/subpath to source-file projection for source-mode analysis.

***

### surfacePolicy

> `readonly` **surfacePolicy**: [`SurfacePolicy`](SurfacePolicy.md)

Defined in: [audit/src/devops-profile.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L66)

Known public-surface files (orphan-detection seed).
