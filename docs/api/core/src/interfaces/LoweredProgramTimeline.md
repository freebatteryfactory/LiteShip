[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / LoweredProgramTimeline

# Interface: LoweredProgramTimeline

Defined in: [core/src/transition-program.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L105)

Result of [lowerTransitionProgram](../functions/lowerTransitionProgram.md): the composed duration + ordered windows.

## Properties

### diagnostics

> `readonly` **diagnostics**: readonly [`DiagnosticPayload`](DiagnosticPayload.md)[]

Defined in: [core/src/transition-program.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L111)

***

### entries

> `readonly` **entries**: readonly [`ProgramTimelineEntry`](ProgramTimelineEntry.md)[]

Defined in: [core/src/transition-program.ts:108](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L108)

***

### selectedBranchIds

> `readonly` **selectedBranchIds**: readonly `string`[]

Defined in: [core/src/transition-program.ts:110](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L110)

The `branchId` of every executed `choice` arm, in traversal order (auditable).

***

### totalMs

> `readonly` **totalMs**: `number`

Defined in: [core/src/transition-program.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L107)

Total composed duration in ms (seq: `Σ`; par: `max`; choice: selected branch).
