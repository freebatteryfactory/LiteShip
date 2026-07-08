[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / resolveScrollTimelineInitialState

# Function: resolveScrollTimelineInitialState()

> **resolveScrollTimelineInitialState**(`intent`, `opts`): `"before"` \| `"after"`

Defined in: [core/src/scroll-timeline.ts:252](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scroll-timeline.ts#L252)

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
