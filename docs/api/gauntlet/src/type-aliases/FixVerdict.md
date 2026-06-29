[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FixVerdict

# Type Alias: FixVerdict

> **FixVerdict** = \{ `_tag`: `"admitted"`; \} \| \{ `_tag`: `"rejected"`; `reasons`: readonly [`FixRejection`](../interfaces/FixRejection.md)[]; \}

Defined in: [gauntlet/src/declared-fix.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L193)

The verifier's VERDICT — `admitted` (the fix is in-scope, sized, non-weakening, and
receipted) or `rejected` with the structured reasons + NO admission. A
`_tag`-discriminated union (composition, not a status enum + nullable fields), so
the gate folds on the tag.
