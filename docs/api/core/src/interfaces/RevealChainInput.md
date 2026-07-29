[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / RevealChainInput

# Interface: RevealChainInput

Defined in: [core/src/motion/reveal.ts:426](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L426)

Authoring input to [lowerRevealChain](../functions/lowerRevealChain.md) — a REAL multi-step chain on ONE
target: a `seq` of steps, optionally followed by a `choice` (branches + an
`otherwise`). Lowers to one graph + a [TransitionProgram](../type-aliases/TransitionProgram.md) the motion floor
drives, replacing the pre-W9 routing-label collapse (#141).

## Properties

### choice?

> `readonly` `optional` **choice?**: `object`

Defined in: [core/src/motion/reveal.ts:430](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L430)

#### branches

> `readonly` **branches**: readonly [`RevealChainBranch`](RevealChainBranch.md)[]

#### otherwise?

> `readonly` `optional` **otherwise?**: [`RevealChainStep`](RevealChainStep.md)

***

### policy

> `readonly` **policy**: [`RevealPolicy`](RevealPolicy.md)

Defined in: [core/src/motion/reveal.ts:431](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L431)

***

### steps

> `readonly` **steps**: readonly [`RevealChainStep`](RevealChainStep.md)[]

Defined in: [core/src/motion/reveal.ts:429](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L429)

***

### target

> `readonly` **target**: `string`

Defined in: [core/src/motion/reveal.ts:427](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L427)

***

### trigger

> `readonly` **trigger**: [`RevealTrigger`](../type-aliases/RevealTrigger.md)

Defined in: [core/src/motion/reveal.ts:428](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L428)
