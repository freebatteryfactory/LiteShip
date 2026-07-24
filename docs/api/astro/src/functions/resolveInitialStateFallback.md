[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / resolveInitialStateFallback

# Function: resolveInitialStateFallback()

> **resolveInitialStateFallback**(`boundary`): `string`

Defined in: [astro/src/Adaptive.ts:169](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L169)

Resolve initial state from a boundary for SSR.

Uses a first-state heuristic since the server has no live signal value.
For smarter resolution with client hints and user agent parsing, use
`resolveInitialState` from `./quantize.js` instead.

## Parameters

### boundary

[`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

## Returns

`string`
