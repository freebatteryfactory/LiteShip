[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / resolveStaggerInitialState

# Function: resolveStaggerInitialState()

> **resolveStaggerInitialState**(`intent`, `opts`): `"before"` \| `"after"`

Defined in: [core/src/motion/stagger.ts:298](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/stagger.ts#L298)

Resolve the discrete state for SSR / reduced-motion first paint (#124).
When `reducedMotion: 'settle'` and the user prefers reduced motion, settle
immediately to the `to` pose — no tween, no stagger delay.

## Parameters

### intent

[`StaggerIntent`](../interfaces/StaggerIntent.md)

### opts

#### prefersReducedMotion

`boolean`

## Returns

`"before"` \| `"after"`
