[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / lowerRevealChain

# Function: lowerRevealChain()

> **lowerRevealChain**(`input`): [`LoweredRevealChain`](../interfaces/LoweredRevealChain.md)

Defined in: core/dist/motion/reveal.d.ts:139

Lower a [RevealChainInput](../interfaces/RevealChainInput.md) into ONE DocumentGraph (one signal + component +
entity, N pose pairs + N transitions) plus a [TransitionProgram](../type-aliases/TransitionProgram.md) composing
them: `seq` over the steps, with an optional trailing `choice`. This is the
authoring sugar for the explicit multi-transition algebra — `interpretProgram`
lowers the returned program to multi-offset keyframes + per-window sub-samplers.

## Parameters

### input

[`RevealChainInput`](../interfaces/RevealChainInput.md)

## Returns

[`LoweredRevealChain`](../interfaces/LoweredRevealChain.md)
