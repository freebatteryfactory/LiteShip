[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / BranchCondition

# Type Alias: BranchCondition

> **BranchCondition** = \{ `op`: `"lt"` \| `"lte"` \| `"gt"` \| `"gte"` \| `"eq"`; `value`: `number`; \} \| \{ `hi`: `number`; `lo`: `number`; `op`: `"between"`; \}

Defined in: core/dist/motion/transition-program.d.ts:37

A predicate over a named signal's live value that selects a `choice` branch.
`op` mirrors the comparison vocabulary; `between` is the half-open `[lo, hi)`
band. Evaluated against [ProgramEnv](../interfaces/ProgramEnv.md) at lowering time so the selected
branch is a stable, auditable receipt.
