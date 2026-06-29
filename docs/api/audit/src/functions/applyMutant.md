[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / applyMutant

# Function: applyMutant()

> **applyMutant**(`originalSource`, `mutant`): `string`

Defined in: [audit/src/mutation-engine.ts:264](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L264)

Reconstruct the mutated source for ONE mutant — a single precise text splice of
its `[start, end)` span. Byte-exact everywhere outside the span, so the only
change between original and mutated source is the operator's rewrite (the whole
point: the test that fails must fail BECAUSE of the operator, not because of a
re-serialization artefact). Pure — derives entirely from `originalSource` + the
mutant's offsets.

## Parameters

### originalSource

`string`

### mutant

[`MutantCore`](../interfaces/MutantCore.md)

## Returns

`string`
