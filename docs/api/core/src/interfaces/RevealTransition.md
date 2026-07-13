[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RevealTransition

# Interface: RevealTransition

Defined in: [core/src/reveal.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L44)

Timing config for the reveal transition.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [core/src/reveal.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L45)

***

### easing?

> `readonly` `optional` **easing?**: `"linear"` \| `"ease"` \| `"spring"`

Defined in: [core/src/reveal.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L46)

***

### spring?

> `readonly` `optional` **spring?**: `SpringConfigShape`

Defined in: [core/src/reveal.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L52)

Spring physics for `easing: 'spring'` (ignored otherwise). Carried through to
the lowered [TransitionNode](TransitionNode.md) so BOTH the CSS `linear()` and the JS floor
sample this ONE config; omitted ⇒ the shared `DEFAULT_MOTION_SPRING`.
