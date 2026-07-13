[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / BranchCondition

# Type Alias: BranchCondition

> **BranchCondition** = \{ `op`: `"lt"` \| `"lte"` \| `"gt"` \| `"gte"` \| `"eq"`; `value`: `number`; \} \| \{ `hi`: `number`; `lo`: `number`; `op`: `"between"`; \}

Defined in: [core/src/transition-program.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L52)

A predicate over a named signal's live value that selects a `choice` branch.
`op` mirrors the comparison vocabulary; `between` is the half-open `[lo, hi)`
band. Evaluated against [ProgramEnv](../interfaces/ProgramEnv.md) at lowering time so the selected
branch is a stable, auditable receipt.
