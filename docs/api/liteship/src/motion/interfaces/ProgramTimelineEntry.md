[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / ProgramTimelineEntry

# Interface: ProgramTimelineEntry

Defined in: core/dist/motion/transition-program.d.ts:88

One entry in a lowered program timeline: a transition mapped to its `[0,1]` window.

## Properties

### branchGuard?

> `readonly` `optional` **branchGuard?**: [`BranchGuard`](BranchGuard.md)

Defined in: core/dist/motion/transition-program.d.ts:95

Present iff this entry was selected from a `choice` — the audit receipt.

***

### transitionId

> `readonly` **transitionId**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/motion/transition-program.d.ts:89

***

### windowEnd

> `readonly` **windowEnd**: `number`

Defined in: core/dist/motion/transition-program.d.ts:93

Global normalized window end in `[0,1]`.

***

### windowStart

> `readonly` **windowStart**: `number`

Defined in: core/dist/motion/transition-program.d.ts:91

Global normalized window start in `[0,1]`.
