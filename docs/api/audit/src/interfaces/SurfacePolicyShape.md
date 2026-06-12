[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SurfacePolicyShape

# Interface: SurfacePolicyShape

Defined in: [audit/src/devops-profile.ts:21](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L21)

Structural shape of the surface policy the audit reads. Every field is
OPTIONAL: an absent surface is a surface the profile never declared, so its
check does not run — a downstream project with no Astro/Vite host supplies
`{}` and carries no host assumptions. The LiteShip `surfacePolicy` const is
the fully-populated reference.

## Properties

### astroClientDirectives?

> `readonly` `optional` **astroClientDirectives?**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:24](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L24)

***

### astroPackage?

> `readonly` `optional` **astroPackage?**: `string`

Defined in: [audit/src/devops-profile.ts:23](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L23)

Astro host package name. Absent/empty — no Astro host, no astro checks.

***

### astroRuntimeFiles?

> `readonly` `optional` **astroRuntimeFiles?**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L31)

Shared runtime adapter files, relative to the astro PACKAGE root (e.g.
`'src/runtime/boundary.ts'`). Entries starting with `packages/` are
treated as repo-root-relative for back-compat with pre-consumer-mode
profiles.

***

### knownCapabilityNotes?

> `readonly` `optional` **knownCapabilityNotes?**: readonly `object`[]

Defined in: [audit/src/devops-profile.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L41)

***

### vitePackage?

> `readonly` `optional` **vitePackage?**: `string`

Defined in: [audit/src/devops-profile.ts:38](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L38)

Package owning the Vite virtual-module inventory (e.g. `'@czap/vite'`).
When absent, the legacy repo-root-relative `packages/vite/...` location
is used so existing profiles keep working.

***

### viteVirtualModules?

> `readonly` `optional` **viteVirtualModules?**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L32)

***

### viteVirtualModulesFile?

> `readonly` `optional` **viteVirtualModulesFile?**: `string`

Defined in: [audit/src/devops-profile.ts:40](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L40)

Virtual-module inventory file, relative to `vitePackage`'s root.
