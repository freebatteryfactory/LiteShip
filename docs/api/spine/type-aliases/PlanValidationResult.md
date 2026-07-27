[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / PlanValidationResult

# Type Alias: PlanValidationResult

> **PlanValidationResult** = \{ `ok`: `true`; `plan`: [`PlanIR`](../interfaces/PlanIR.md); \} \| \{ `errors`: readonly [`PlanValidationError`](PlanValidationError.md)[]; `ok`: `false`; \}

Defined in: [\_spine/core.d.ts:1235](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1235)

Success or bounded failure result from plan validation.
