[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SurfacePolicyShape

# Interface: SurfacePolicyShape

Defined in: [audit/src/devops-profile.ts:18](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L18)

Structural shape of the surface policy the audit reads (wide — `string[]`, not
the `as const` literal tuples of the LiteShip default — so an alternate project
profile can supply its own). The LiteShip `surfacePolicy` const assigns into this.

## Properties

### astroClientDirectives

> `readonly` **astroClientDirectives**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:20](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L20)

***

### astroPackage

> `readonly` **astroPackage**: `string`

Defined in: [audit/src/devops-profile.ts:19](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L19)

***

### astroRuntimeFiles

> `readonly` **astroRuntimeFiles**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L27)

Shared runtime adapter files, relative to the astro PACKAGE root (e.g.
`'src/runtime/boundary.ts'`). Entries starting with `packages/` are
treated as repo-root-relative for back-compat with pre-consumer-mode
profiles.

***

### knownCapabilityNotes

> `readonly` **knownCapabilityNotes**: readonly `object`[]

Defined in: [audit/src/devops-profile.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L37)

***

### vitePackage?

> `readonly` `optional` **vitePackage?**: `string`

Defined in: [audit/src/devops-profile.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L34)

Package owning the Vite virtual-module inventory (e.g. `'@czap/vite'`).
When absent, the legacy repo-root-relative `packages/vite/...` location
is used so existing profiles keep working.

***

### viteVirtualModules

> `readonly` **viteVirtualModules**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:28](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L28)

***

### viteVirtualModulesFile?

> `readonly` `optional` **viteVirtualModulesFile?**: `string`

Defined in: [audit/src/devops-profile.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L36)

Virtual-module inventory file, relative to `vitePackage`'s root.
