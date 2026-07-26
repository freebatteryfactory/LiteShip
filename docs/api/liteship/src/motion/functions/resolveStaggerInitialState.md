[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / resolveStaggerInitialState

# Function: resolveStaggerInitialState()

> **resolveStaggerInitialState**(`intent`, `opts`): `"before"` \| `"after"`

Defined in: core/dist/motion/stagger.d.ts:67

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
