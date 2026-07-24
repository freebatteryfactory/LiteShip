[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / LoweredProgramTimeline

# Interface: LoweredProgramTimeline

Defined in: [core/src/motion/transition-program.ts:106](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L106)

Result of [lowerTransitionProgram](../functions/lowerTransitionProgram.md): the composed duration + ordered windows.

## Properties

### diagnostics

> `readonly` **diagnostics**: readonly `MotionDiagnosticPayload`[]

Defined in: [core/src/motion/transition-program.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L112)

***

### entries

> `readonly` **entries**: readonly [`ProgramTimelineEntry`](ProgramTimelineEntry.md)[]

Defined in: [core/src/motion/transition-program.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L109)

***

### selectedBranchIds

> `readonly` **selectedBranchIds**: readonly `string`[]

Defined in: [core/src/motion/transition-program.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L111)

The `branchId` of every executed `choice` arm, in traversal order (auditable).

***

### totalMs

> `readonly` **totalMs**: `number`

Defined in: [core/src/motion/transition-program.ts:108](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L108)

Total composed duration in ms (seq: `Σ`; par: `max`; choice: selected branch).
