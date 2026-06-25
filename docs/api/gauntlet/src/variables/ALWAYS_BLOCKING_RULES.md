[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ALWAYS\_BLOCKING\_RULES

# Variable: ALWAYS\_BLOCKING\_RULES

> `const` **ALWAYS\_BLOCKING\_RULES**: readonly `string`[]

Defined in: [gauntlet/src/waiver.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/waiver.ts#L68)

Rule ids a waiver can NEVER cover — the skip / placeholder family. A waiver
targeting one of these is VOID (it errors, and the finding it tried to
suppress is still kept). This is the "you cannot waive a lie" floor: a
placeholder / skipped test / TODO is never shippable and never waivable.

These two ids are exactly the rules the always-blocking gates emit —
`noPlaceholderGate` (`gauntlet/no-placeholder`) and `noSkippedTestGate`
(`gauntlet/no-skipped-test`). The floor is therefore NOT inert surface: a real
gate emits each rule, so a waiver that tries to cover a placeholder or a skipped
test is void against a finding that actually exists. Easy to extend: append the
rule id of any future always-blocking gate. Kept as a `readonly string[]` so
downstream can compose its own forbidden set by spreading this one:
`[...ALWAYS_BLOCKING_RULES, 'my/never-waivable']`.
