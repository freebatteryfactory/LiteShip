[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TransitionBranch

# Interface: TransitionBranch

Defined in: [core/src/transition-program.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L57)

One `choice` arm: a condition over a named signal source guarding a sub-program.

## Properties

### body

> `readonly` **body**: [`TransitionProgram`](../type-aliases/TransitionProgram.md)

Defined in: [core/src/transition-program.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L60)

***

### source

> `readonly` **source**: [`SignalInput`](../type-aliases/SignalInput.md)

Defined in: [core/src/transition-program.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L59)

***

### when

> `readonly` **when**: [`BranchCondition`](../type-aliases/BranchCondition.md)

Defined in: [core/src/transition-program.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L58)
