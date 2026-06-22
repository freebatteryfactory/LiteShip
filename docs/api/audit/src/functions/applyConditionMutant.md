[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / applyConditionMutant

# Function: applyConditionMutant()

> **applyConditionMutant**(`originalSource`, `mutant`): `string`

Defined in: [audit/src/mcdc-engine.ts:331](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L331)

Reconstruct the mutated source for ONE condition-mutant — a single precise text
splice of its `[start, end)` condition span with the `(true)`/`(false)` pin. Reuses
the mutation engine's [applyMutant](applyMutant.md) verbatim (a ConditionMutant IS a MutantCore), so
the splice is byte-exact everywhere outside the span — the only change is the pin.

## Parameters

### originalSource

`string`

### mutant

[`ConditionMutant`](../interfaces/ConditionMutant.md)

## Returns

`string`
