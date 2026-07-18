[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SpineRelationBuildOptions

# Interface: SpineRelationBuildOptions

Defined in: [audit/src/spine-relation-build.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L63)

Options for [buildSpineRelationFacts](../functions/buildSpineRelationFacts.md).

## Properties

### overlay?

> `readonly` `optional` **overlay?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [audit/src/spine-relation-build.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L70)

In-memory content overrides, keyed by ABSOLUTE path — the seam the acceptance test
uses to inject a DRIFTED spine (e.g. CapSet `Set`→array) without touching disk. A
path present here is served with the override content; every other file reads from
the real filesystem.
