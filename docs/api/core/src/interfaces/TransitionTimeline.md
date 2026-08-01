[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / TransitionTimeline

# Interface: TransitionTimeline

Defined in: [core/src/motion/transition-program.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L107)

Result of [lowerTransitionProgram](../functions/lowerTransitionProgram.md): the composed duration + ordered windows.

## Properties

### diagnostics

> `readonly` **diagnostics**: readonly `MotionDiagnosticPayload`[]

Defined in: [core/src/motion/transition-program.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L113)

***

### entries

> `readonly` **entries**: readonly [`ProgramTimelineEntry`](ProgramTimelineEntry.md)[]

Defined in: [core/src/motion/transition-program.ts:110](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L110)

***

### selectedBranchIds

> `readonly` **selectedBranchIds**: readonly `string`[]

Defined in: [core/src/motion/transition-program.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L112)

The `branchId` of every executed `choice` arm, in traversal order (auditable).

***

### totalMs

> `readonly` **totalMs**: `number`

Defined in: [core/src/motion/transition-program.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L109)

Total composed duration in ms (seq: `Σ`; par: `max`; choice: selected branch).
