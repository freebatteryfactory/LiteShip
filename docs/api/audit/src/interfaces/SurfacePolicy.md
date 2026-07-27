[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SurfacePolicy

# Interface: SurfacePolicy

Defined in: [audit/src/devops-profile.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L22)

Structural shape of the surface policy the audit reads. Every field is
OPTIONAL: an absent surface is a surface the profile never declared, so its
check does not run — a downstream project with no Astro/Vite host supplies
`{}` and carries no host assumptions. A framework host may inject a
fully-populated reference policy.

## Properties

### astroClientDirectives?

> `readonly` `optional` **astroClientDirectives?**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L25)

***

### astroPackage?

> `readonly` `optional` **astroPackage?**: `string`

Defined in: [audit/src/devops-profile.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L24)

Astro host package name. Absent/empty — no Astro host, no astro checks.

***

### astroRuntimeFiles?

> `readonly` `optional` **astroRuntimeFiles?**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L32)

Shared runtime adapter files, relative to the astro PACKAGE root (e.g.
`'src/runtime/boundary.ts'`). Entries starting with `packages/` are
treated as repo-root-relative for back-compat with pre-consumer-mode
profiles.

***

### knownCapabilityNotes?

> `readonly` `optional` **knownCapabilityNotes?**: readonly `object`[]

Defined in: [audit/src/devops-profile.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L42)

***

### vitePackage?

> `readonly` `optional` **vitePackage?**: `string`

Defined in: [audit/src/devops-profile.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L39)

Package owning the Vite virtual-module inventory.
When absent, the legacy repo-root-relative `packages/vite/...` location
is used so existing profiles keep working.

***

### viteVirtualModules?

> `readonly` `optional` **viteVirtualModules?**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L33)

***

### viteVirtualModulesFile?

> `readonly` `optional` **viteVirtualModulesFile?**: `string`

Defined in: [audit/src/devops-profile.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L41)

Virtual-module inventory file, relative to `vitePackage`'s root.
