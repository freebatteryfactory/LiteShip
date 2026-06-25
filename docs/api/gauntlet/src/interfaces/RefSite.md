[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / RefSite

# Interface: RefSite

Defined in: [gauntlet/src/repo-ir.ts:214](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L214)

One site that references a symbol — the entry of the reverse-reference index.
The module-graph layer (design §1 `refs`): for each symbol, every place it is
referenced by name, with the evidence class of that reference.

## Properties

### coverageClass

> `readonly` **coverageClass**: [`CoverageClass`](../type-aliases/CoverageClass.md)

Defined in: [gauntlet/src/repo-ir.ts:220](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L220)

How this reference was evidenced (checker-resolved vs graph vs text).

***

### fromFile

> `readonly` **fromFile**: `string`

Defined in: [gauntlet/src/repo-ir.ts:216](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L216)

The file the reference appears in — MUST exist in [RepoIR.files](RepoIR.md#files).

***

### location?

> `readonly` `optional` **location?**: [`SourceLocation`](SourceLocation.md)

Defined in: [gauntlet/src/repo-ir.ts:218](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L218)

Where in that file, when known.
