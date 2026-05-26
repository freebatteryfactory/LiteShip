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

Defined in: [audit/src/devops-profile.ts:21](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L21)

***

### knownCapabilityNotes

> `readonly` **knownCapabilityNotes**: readonly `object`[]

Defined in: [audit/src/devops-profile.ts:23](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L23)

***

### viteVirtualModules

> `readonly` **viteVirtualModules**: readonly `string`[]

Defined in: [audit/src/devops-profile.ts:22](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L22)
