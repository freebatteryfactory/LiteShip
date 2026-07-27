[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SpineRelationBuildOptions

# Interface: SpineRelationBuildOptions

Defined in: [audit/src/spine-relation-build.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L63)

Options for [buildSpineRelationFacts](../functions/buildSpineRelationFacts.md).

## Properties

### overlay?

> `readonly` `optional` **overlay?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/spine-relation-build.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L74)

In-memory content overrides, keyed by ABSOLUTE path — the seam the acceptance test
uses to inject a DRIFTED spine (e.g. CapSet `Set`→array) without touching disk. A
path present here is served with the override content; every other file reads from
the real filesystem.

***

### spinePackageSpecifier

> `readonly` **spinePackageSpecifier**: `string`

Defined in: [audit/src/spine-relation-build.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L65)

Host-owned module specifier for the declaration spine under test.

***

### typeScriptPathAliases?

> `readonly` `optional` **typeScriptPathAliases?**: `Readonly`\<`Record`\<`string`, readonly `string`[]\>\>

Defined in: [audit/src/spine-relation-build.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L67)

Host-owned source aliases used by the TypeScript resolver.
