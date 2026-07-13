[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / LoweredProgramTimeline

# Interface: LoweredProgramTimeline

Defined in: [core/src/transition-program.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L104)

Result of [lowerTransitionProgram](../functions/lowerTransitionProgram.md): the composed duration + ordered windows.

## Properties

### diagnostics

> `readonly` **diagnostics**: readonly [`DiagnosticPayload`](DiagnosticPayload.md)[]

Defined in: [core/src/transition-program.ts:110](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L110)

***

### entries

> `readonly` **entries**: readonly [`ProgramTimelineEntry`](ProgramTimelineEntry.md)[]

Defined in: [core/src/transition-program.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L107)

***

### selectedBranchIds

> `readonly` **selectedBranchIds**: readonly `string`[]

Defined in: [core/src/transition-program.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L109)

The `branchId` of every executed `choice` arm, in traversal order (auditable).

***

### totalMs

> `readonly` **totalMs**: `number`

Defined in: [core/src/transition-program.ts:106](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L106)

Total composed duration in ms (seq: `Σ`; par: `max`; choice: selected branch).
