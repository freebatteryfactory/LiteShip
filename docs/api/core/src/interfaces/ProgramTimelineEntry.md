[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / ProgramTimelineEntry

# Interface: ProgramTimelineEntry

Defined in: [core/src/motion/transition-program.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L96)

One entry in a lowered program timeline: a transition mapped to its `[0,1]` window.

## Properties

### branchGuard?

> `readonly` `optional` **branchGuard?**: [`BranchGuard`](BranchGuard.md)

Defined in: [core/src/motion/transition-program.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L103)

Present iff this entry was selected from a `choice` — the audit receipt.

***

### transitionId

> `readonly` **transitionId**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/motion/transition-program.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L97)

***

### windowEnd

> `readonly` **windowEnd**: `number`

Defined in: [core/src/motion/transition-program.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L101)

Global normalized window end in `[0,1]`.

***

### windowStart

> `readonly` **windowStart**: `number`

Defined in: [core/src/motion/transition-program.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L99)

Global normalized window start in `[0,1]`.
