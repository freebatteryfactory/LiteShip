[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / RevealTransition

# Interface: RevealTransition

Defined in: core/dist/motion/reveal.d.ts:27

Timing config for the reveal transition.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: core/dist/motion/reveal.d.ts:28

***

### easing?

> `readonly` `optional` **easing?**: `"linear"` \| `"ease"` \| `"spring"`

Defined in: core/dist/motion/reveal.d.ts:29

***

### spring?

> `readonly` `optional` **spring?**: `SpringConfigShape`

Defined in: core/dist/motion/reveal.d.ts:35

Spring physics for `easing: 'spring'` (ignored otherwise). Carried through to
the lowered `TransitionNode` so BOTH the CSS `linear()` and the JS floor
sample this ONE config; omitted ⇒ the shared `DEFAULT_MOTION_SPRING`.
