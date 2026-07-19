[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Reveal

# Variable: Reveal

> `const` **Reveal**: `object`

Defined in: [core/src/motion/reveal.ts:509](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L509)

Authoring sugar namespace — data over intent, no behavior authority.

## Type Declaration

### chain

> `readonly` **chain**: (`input`) => [`LoweredRevealChain`](../interfaces/LoweredRevealChain.md) = `lowerRevealChain`

Author a multi-step chain (`seq` + optional `choice`) → graph + [TransitionProgram](../type-aliases/TransitionProgram.md).

Lower a [RevealChainInput](../interfaces/RevealChainInput.md) into ONE DocumentGraph (one signal + component +
entity, N pose pairs + N transitions) plus a [TransitionProgram](../type-aliases/TransitionProgram.md) composing
them: `seq` over the steps, with an optional trailing `choice`. This is the
authoring sugar for the explicit multi-transition algebra — `interpretProgram`
lowers the returned program to multi-offset keyframes + per-window sub-samplers.

#### Parameters

##### input

[`RevealChainInput`](../interfaces/RevealChainInput.md)

#### Returns

[`LoweredRevealChain`](../interfaces/LoweredRevealChain.md)

### intent()

> `readonly` **intent**(`input`): [`RevealIntent`](../interfaces/RevealIntent.md)

Seal a reveal intent from authoring input.

#### Parameters

##### input

[`RevealIntentInput`](../interfaces/RevealIntentInput.md)

#### Returns

[`RevealIntent`](../interfaces/RevealIntent.md)
