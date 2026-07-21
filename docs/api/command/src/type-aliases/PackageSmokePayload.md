[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PackageSmokePayload

# Type Alias: PackageSmokePayload

> **PackageSmokePayload** = `object`

Defined in: [command/src/commands/package-smoke.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/package-smoke.ts#L95)

Structured payload returned by `package-smoke`.

## Properties

### failedStep

> `readonly` **failedStep**: `string` \| `null`

Defined in: [command/src/commands/package-smoke.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/package-smoke.ts#L99)

***

### failure

> `readonly` **failure**: `string` \| `null`

Defined in: [command/src/commands/package-smoke.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/package-smoke.ts#L100)

***

### hermetic?

> `readonly` `optional` **hermetic?**: \{ `doubleBuildRepro`: \{ `artifactRepro`: `boolean`; `reportPath`: `string`; `semanticRepro`: `boolean`; \}; `hermeticBuild`: \{ `ok`: `boolean`; `reason`: `string` \| `null`; `skipped`: `boolean`; \}; `packedConsumerClosure`: \{ `failure`: `string` \| `null`; `ok`: `boolean`; `subpathCount`: `number`; \}; \} \| `null`

Defined in: [command/src/commands/package-smoke.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/package-smoke.ts#L111)

The three `--hermetic` sub-results — absent unless the run was `--hermetic`.
`hermeticBuild` proves the packed consumer reinstalls with the CHILD install's
network disabled (warm store + `file://` tarballs); `packedConsumerClosure`
import-smokes EVERY public subpath enumerated from the packages' `exports` maps
(a superset of the hand-listed import roster); `doubleBuildRepro` packs twice
and compares the tarball closures (per-file-hash semantic + byte-identical
artifact — advisory). Inlined (not a separate named export) so the command
package's public type surface is unchanged.

***

### importsSmoked

> `readonly` **importsSmoked**: `number`

Defined in: [command/src/commands/package-smoke.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/package-smoke.ts#L98)

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/commands/package-smoke.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/package-smoke.ts#L96)

***

### packagesPacked

> `readonly` **packagesPacked**: `number`

Defined in: [command/src/commands/package-smoke.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/package-smoke.ts#L97)
