[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / stringsBlanked

# Function: stringsBlanked()

> **stringsBlanked**(`src`): `string`

Defined in: [gauntlet/src/gates/code-only.ts:271](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/code-only.ts#L271)

Blank out string-literal CONTENTS only, leaving COMMENTS and code intact
(newlines preserved, so line numbers still align). The floor for a gate whose
target is a comment directive: scanning this lets a genuine ts-ignore directive
comment survive while the identical text written inside a STRING (a fixture or a
description) is erased — so the gate does not flag its own prose. Comments are
NOT blanked here (that is [codeOnly](codeOnly.md)'s job).

## Parameters

### src

`string`

## Returns

`string`
