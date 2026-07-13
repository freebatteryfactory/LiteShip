[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / resolveRevealInitialState

# Function: resolveRevealInitialState()

> **resolveRevealInitialState**(`intent`, `opts`): [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/reveal.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L176)

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

[`StateName`](../type-aliases/StateName.md)
