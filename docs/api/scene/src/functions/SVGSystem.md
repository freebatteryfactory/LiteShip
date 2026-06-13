[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SVGSystem

# Function: SVGSystem()

> **SVGSystem**(`frameIndex`): `SystemShape`

Defined in: [scene/src/systems/svg.ts:60](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/systems/svg.ts#L60)

Build an SVGSystem keyed to a specific frame index.

The `frameIndex` parameter keeps signature parity with the other
frame-indexed system factories (the runtime wraps them uniformly), but
SVGSystem deliberately does NOT use it for computation: it composes
purely from `_opacity`/`_blend` that frame-indexed *earlier* systems
already wrote this tick. Recomputing from `frameIndex` here would
duplicate — and risk diverging from — those upstream outputs.

## Parameters

### frameIndex

`number`

## Returns

`SystemShape`
