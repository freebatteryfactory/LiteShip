[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / staggerProgram

# Function: staggerProgram()

> **staggerProgram**(`lowered`): [`TransitionProgram`](../type-aliases/TransitionProgram.md)

Defined in: [core/src/motion/stagger.ts:282](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/stagger.ts#L282)

Compose a [LoweredStagger](../interfaces/LoweredStagger.md)'s children into a `par` [TransitionProgram](../type-aliases/TransitionProgram.md)
(#141). Each staggered child becomes a `step` carrying its compile-time
`delayMs`; the `par` total is the `max` child window, so `interpretProgram` emits
REAL per-child windows (the delays ride the offsets) instead of the pre-W9
routing-label collapse. The authoring bridge from Stagger sugar to the algebra.

## Parameters

### lowered

[`LoweredStagger`](../interfaces/LoweredStagger.md)

## Returns

[`TransitionProgram`](../type-aliases/TransitionProgram.md)
