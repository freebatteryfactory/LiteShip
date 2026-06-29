[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / commentsBlanked

# Function: commentsBlanked()

> **commentsBlanked**(`src`): `string`

Defined in: [gauntlet/src/gates/code-only.ts:405](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/code-only.ts#L405)

Blank out COMMENT CONTENTS only, leaving STRING LITERALS and code intact
(newlines preserved, so line numbers still align). The complement of
[stringsBlanked](stringsBlanked.md): the floor for a scanner whose target is a string-literal
VALUE (e.g. a benchmark's registered name in `bench('name', …)`) that must
survive while a commented-out copy (`// bench('name', …)`) vanishes. A genuine
registration's name is preserved; a commented-out registration is erased, so a
disabled bench does not count as registered.

Same five-state char machine as [codeOnly](codeOnly.md); only the disposition differs —
strings pass through verbatim, comment contents are replaced with spaces.

## Parameters

### src

`string`

## Returns

`string`
