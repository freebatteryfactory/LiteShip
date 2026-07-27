[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / TransitionProgram

# Type Alias: TransitionProgram

> **TransitionProgram** = \{ `delayMs?`: `number`; `kind`: `"step"`; `transitionId`: [`ContentAddress`](../../schema/type-aliases/ContentAddress.md); \} \| \{ `children`: readonly `TransitionProgram`[]; `kind`: `"seq"`; \} \| \{ `children`: readonly `TransitionProgram`[]; `kind`: `"par"`; \} \| \{ `branches`: readonly [`TransitionBranch`](../interfaces/TransitionBranch.md)[]; `kind`: `"choice"`; `otherwise?`: `TransitionProgram`; \}

Defined in: core/dist/motion/transition-program.d.ts:62

The composition tree over `TransitionNode`s.

- `step` — one transition (Pose→Pose), optionally preceded by `delayMs` dead time.
- `seq` — deterministic duration composition: total is `Σ` children (+ delays),
  each child mapped to a disjoint sub-window.
- `par` — total is the `max` child duration; children share the window, each
  scaled to its own duration; a short child holds its final pose after completing.
- `choice` — EXACTLY ONE branch executes, selected by [BranchCondition](BranchCondition.md)
  over its named signal source; unchosen branches never write.
