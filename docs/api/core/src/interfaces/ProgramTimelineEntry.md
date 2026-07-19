[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ProgramTimelineEntry

# Interface: ProgramTimelineEntry

Defined in: [core/src/transition-program.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L95)

One entry in a lowered program timeline: a transition mapped to its `[0,1]` window.

## Properties

### branchGuard?

> `readonly` `optional` **branchGuard?**: [`BranchGuard`](BranchGuard.md)

Defined in: [core/src/transition-program.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L102)

Present iff this entry was selected from a `choice` — the audit receipt.

***

### transitionId

> `readonly` **transitionId**: `ContentAddress`

Defined in: [core/src/transition-program.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L96)

***

### windowEnd

> `readonly` **windowEnd**: `number`

Defined in: [core/src/transition-program.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L100)

Global normalized window end in `[0,1]`.

***

### windowStart

> `readonly` **windowStart**: `number`

Defined in: [core/src/transition-program.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L98)

Global normalized window start in `[0,1]`.
