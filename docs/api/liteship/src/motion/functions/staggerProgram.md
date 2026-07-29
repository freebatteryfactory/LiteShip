[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / staggerProgram

# Function: staggerProgram()

> **staggerProgram**(`lowered`): [`TransitionProgram`](../type-aliases/TransitionProgram.md)

Defined in: core/dist/motion/stagger.d.ts:61

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
