[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / PlanValidationError

# Type Alias: PlanValidationError

> **PlanValidationError** = \{ `message`: `string`; `stepIds?`: readonly `string`[]; `type`: `"cycle"`; \} \| \{ `message`: `string`; `stepIds?`: readonly `string`[]; `type`: `"missing_step"`; \}

Defined in: [\_spine/core.d.ts:1445](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1445)

Closed structural errors produced by plan validation.
