[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / resolveScrollTimelineInitialState

# Function: resolveScrollTimelineInitialState()

> **resolveScrollTimelineInitialState**(`intent`, `opts`): `"before"` \| `"after"`

Defined in: core/dist/motion/scroll-timeline.d.ts:51

Resolve the discrete state for SSR / reduced-motion first paint (#126).
When `reducedMotion: 'settle'` and the user prefers reduced motion, settle
immediately to the `after` pose — no scroll-driven tween.

## Parameters

### intent

[`ScrollTimelineIntent`](../interfaces/ScrollTimelineIntent.md)

### opts

#### prefersReducedMotion

`boolean`

## Returns

`"before"` \| `"after"`
