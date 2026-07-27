[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / resolveRevealInitialState

# Function: resolveRevealInitialState()

> **resolveRevealInitialState**(`intent`, `opts`): [`StateName`](../../schema/type-aliases/StateName.md)

Defined in: core/dist/motion/reveal.d.ts:81

Resolve the discrete state for SSR / reduced-motion first paint.

When `reducedMotion: 'settle'` and the user prefers reduced motion, the reveal
settles immediately to the `after` pose — no tween, no per-frame patch.

## Parameters

### intent

[`RevealIntent`](../interfaces/RevealIntent.md)

### opts

#### prefersReducedMotion

`boolean`

## Returns

[`StateName`](../../schema/type-aliases/StateName.md)
