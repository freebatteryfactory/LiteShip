[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SanitizerSite

# Interface: SanitizerSite

Defined in: [gauntlet/src/taint-facts.ts:107](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L107)

The sanitizer the trace observed on a path — its callee name + where it sat.

## Properties

### callee

> `readonly` **callee**: `string`

Defined in: [gauntlet/src/taint-facts.ts:109](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L109)

The sanitizer's classified callee name (e.g. `validateGraphPatchProposal`).

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/taint-facts.ts:111](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L111)

The repo-relative file the sanitizer call sits in.

***

### line

> `readonly` **line**: `number`

Defined in: [gauntlet/src/taint-facts.ts:113](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L113)

1-based line of the sanitizer call.
