[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / TransitionTimeline

# Interface: TransitionTimeline

Defined in: core/dist/motion/transition-program.d.ts:98

Result of [lowerTransitionProgram](../functions/lowerTransitionProgram.md): the composed duration + ordered windows.

## Properties

### diagnostics

> `readonly` **diagnostics**: readonly `MotionDiagnosticPayload`[]

Defined in: core/dist/motion/transition-program.d.ts:104

***

### entries

> `readonly` **entries**: readonly [`ProgramTimelineEntry`](ProgramTimelineEntry.md)[]

Defined in: core/dist/motion/transition-program.d.ts:101

***

### selectedBranchIds

> `readonly` **selectedBranchIds**: readonly `string`[]

Defined in: core/dist/motion/transition-program.d.ts:103

The `branchId` of every executed `choice` arm, in traversal order (auditable).

***

### totalMs

> `readonly` **totalMs**: `number`

Defined in: core/dist/motion/transition-program.d.ts:100

Total composed duration in ms (seq: `Σ`; par: `max`; choice: selected branch).
