[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RevealChainInput

# Interface: RevealChainInput

Defined in: [core/src/reveal.ts:353](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L353)

Authoring input to [lowerRevealChain](../functions/lowerRevealChain.md) — a REAL multi-step chain on ONE
target: a `seq` of steps, optionally followed by a `choice` (branches + an
`otherwise`). Lowers to one graph + a [TransitionProgram](../type-aliases/TransitionProgram.md) the motion floor
drives, replacing the pre-W9 routing-label collapse (#141).

## Properties

### choice?

> `readonly` `optional` **choice?**: `object`

Defined in: [core/src/reveal.ts:357](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L357)

#### branches

> `readonly` **branches**: readonly [`RevealChainBranch`](RevealChainBranch.md)[]

#### otherwise?

> `readonly` `optional` **otherwise?**: [`RevealChainStep`](RevealChainStep.md)

***

### policy

> `readonly` **policy**: [`RevealPolicy`](RevealPolicy.md)

Defined in: [core/src/reveal.ts:358](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L358)

***

### steps

> `readonly` **steps**: readonly [`RevealChainStep`](RevealChainStep.md)[]

Defined in: [core/src/reveal.ts:356](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L356)

***

### target

> `readonly` **target**: `string`

Defined in: [core/src/reveal.ts:354](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L354)

***

### trigger

> `readonly` **trigger**: [`RevealTrigger`](../type-aliases/RevealTrigger.md)

Defined in: [core/src/reveal.ts:355](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L355)
