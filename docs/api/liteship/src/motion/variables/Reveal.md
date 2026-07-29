[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / Reveal

# Variable: Reveal

> `const` **Reveal**: `object`

Defined in: core/dist/motion/reveal.d.ts:141

Authoring sugar namespace — data over intent, no behavior authority.

## Type Declaration

### chain

> `readonly` **chain**: *typeof* [`lowerRevealChain`](../functions/lowerRevealChain.md)

Author a multi-step chain (`seq` + optional `choice`) → graph + [TransitionProgram](../type-aliases/TransitionProgram.md).

### intent

> `readonly` **intent**: (`input`) => [`RevealIntent`](../interfaces/RevealIntent.md)

Seal a reveal intent from authoring input.

#### Parameters

##### input

[`RevealIntentInput`](../interfaces/RevealIntentInput.md)

#### Returns

[`RevealIntent`](../interfaces/RevealIntent.md)
