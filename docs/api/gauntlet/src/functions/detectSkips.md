[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / detectSkips

# Function: detectSkips()

> **detectSkips**(`text`): readonly [`SkipMatch`](../interfaces/SkipMatch.md)[]

Defined in: [gauntlet/src/gates/skip-detect.ts:486](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/skip-detect.ts#L486)

Scan ONE file's text for EVERY skip form, over [codeOnly](codeOnly.md) text (comments + top-level
string literals blanked) so a prose/fixture mention of `it.skip` is never flagged. Returns
one [SkipMatch](../interfaces/SkipMatch.md) per matched line/form, de-duplicated. PURE — no I/O.

FILE-AWARE: a per-file resolveAliases PRE-PASS runs first (over the same `codeOnly`
text) so a runner rebind / import-rename / `.skip`-capture / destructured skip member is
resolved to a real root BEFORE the line-by-line token walk — closing the codex round-4
aliased-root evasion. See the module docstring for the resolved vs flagged vs undecidable
boundary.

## Parameters

### text

`string`

## Returns

readonly [`SkipMatch`](../interfaces/SkipMatch.md)[]
