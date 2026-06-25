[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ActualChange

# Interface: ActualChange

Defined in: [gauntlet/src/declared-fix.ts:160](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L160)

The ACTUAL change the host MEASURED — what really happened on disk (the
counterpart to the [DeclaredFix](DeclaredFix.md)'s declaration). The host computes this from
the working tree / the apply diff; the verifier checks the declaration against it.
Pure data — no I/O here.

## Properties

### \_tag

> `readonly` **\_tag**: `"actual-change"`

Defined in: [gauntlet/src/declared-fix.ts:161](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L161)

***

### changedFiles

> `readonly` **changedFiles**: readonly `string`[]

Defined in: [gauntlet/src/declared-fix.ts:163](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L163)

The repo-relative paths the change actually touched (added / modified / deleted).

***

### changedLines

> `readonly` **changedLines**: `number`

Defined in: [gauntlet/src/declared-fix.ts:165](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L165)

The total changed lines (added + removed) the host measured across all touched files.
