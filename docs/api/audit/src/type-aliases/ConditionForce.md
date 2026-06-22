[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / ConditionForce

# Type Alias: ConditionForce

> **ConditionForce** = `"force-condition-true"` \| `"force-condition-false"`

Defined in: [audit/src/mcdc-engine.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L79)

The force direction a condition-mutant pins its atomic condition to — a `_tag`-style
value (composition). `true` splices `(true)` over the condition span; `false` splices
`(false)`. The pin is wrapped in parentheses so the splice is always a valid
expression in its syntactic position (a forced operand of `&&`/`||`, the test of an
`if`/`while`/`for`, a ternary test, or a returned boolean) regardless of surrounding
precedence.
