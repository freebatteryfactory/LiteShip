[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FixSizeCap

# Interface: FixSizeCap

Defined in: [gauntlet/src/declared-fix.ts:145](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L145)

The size ceiling a [DeclaredFix](DeclaredFix.md) is capped to. BOTH ceilings are hard upper
bounds — a change exceeding EITHER is rejected (a raccoon cannot smuggle a large
edit by declaring a small file count but a huge line delta, or vice versa).

## Properties

### maxChangedFiles

> `readonly` **maxChangedFiles**: `number`

Defined in: [gauntlet/src/declared-fix.ts:147](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L147)

Max number of files the change may touch (≥ the actually-changed file count).

***

### maxChangedLines

> `readonly` **maxChangedLines**: `number`

Defined in: [gauntlet/src/declared-fix.ts:149](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L149)

Max total changed lines (added + removed) across all touched files.
