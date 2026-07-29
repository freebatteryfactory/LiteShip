[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / PlanValidationResult

# Type Alias: PlanValidationResult

> **PlanValidationResult** = \{ `ok`: `true`; `plan`: [`PlanIR`](../interfaces/PlanIR.md); \} \| \{ `errors`: readonly [`PlanValidationError`](PlanValidationError.md)[]; `ok`: `false`; \}

Defined in: [\_spine/core.d.ts:1451](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1451)

Success or bounded failure result from plan validation.
