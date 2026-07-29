[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / RevealTransition

# Interface: RevealTransition

Defined in: [core/src/motion/reveal.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L48)

Timing config for the reveal transition.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [core/src/motion/reveal.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L49)

***

### easing?

> `readonly` `optional` **easing?**: `"linear"` \| `"ease"` \| `"spring"`

Defined in: [core/src/motion/reveal.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L50)

***

### spring?

> `readonly` `optional` **spring?**: `SpringConfigShape`

Defined in: [core/src/motion/reveal.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L56)

Spring physics for `easing: 'spring'` (ignored otherwise). Carried through to
the lowered `TransitionNode` so BOTH the CSS `linear()` and the JS floor
sample this ONE config; omitted ⇒ the shared `DEFAULT_MOTION_SPRING`.
