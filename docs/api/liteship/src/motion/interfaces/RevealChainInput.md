[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / RevealChainInput

# Interface: RevealChainInput

Defined in: core/dist/motion/reveal.d.ts:113

Authoring input to [lowerRevealChain](../functions/lowerRevealChain.md) — a REAL multi-step chain on ONE
target: a `seq` of steps, optionally followed by a `choice` (branches + an
`otherwise`). Lowers to one graph + a [TransitionProgram](../type-aliases/TransitionProgram.md) the motion floor
drives, replacing the pre-W9 routing-label collapse (#141).

## Properties

### choice?

> `readonly` `optional` **choice?**: `object`

Defined in: core/dist/motion/reveal.d.ts:117

#### branches

> `readonly` **branches**: readonly [`RevealChainBranch`](RevealChainBranch.md)[]

#### otherwise?

> `readonly` `optional` **otherwise?**: [`RevealChainStep`](RevealChainStep.md)

***

### policy

> `readonly` **policy**: [`RevealPolicy`](RevealPolicy.md)

Defined in: core/dist/motion/reveal.d.ts:121

***

### steps

> `readonly` **steps**: readonly [`RevealChainStep`](RevealChainStep.md)[]

Defined in: core/dist/motion/reveal.d.ts:116

***

### target

> `readonly` **target**: `string`

Defined in: core/dist/motion/reveal.d.ts:114

***

### trigger

> `readonly` **trigger**: [`RevealTrigger`](../type-aliases/RevealTrigger.md)

Defined in: core/dist/motion/reveal.d.ts:115
