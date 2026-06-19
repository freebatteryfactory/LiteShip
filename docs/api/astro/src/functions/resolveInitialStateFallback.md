[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / resolveInitialStateFallback

# Function: resolveInitialStateFallback()

> **resolveInitialStateFallback**(`boundary`): `string`

Defined in: [astro/src/Satellite.ts:166](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L166)

Resolve initial state from a boundary for SSR.

Uses a first-state heuristic since the server has no live signal value.
For smarter resolution with client hints and user agent parsing, use
`resolveInitialState` from `./quantize.js` instead.

## Parameters

### boundary

[`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)

## Returns

`string`
