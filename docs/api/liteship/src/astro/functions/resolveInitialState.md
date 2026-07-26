[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / resolveInitialState

# Function: resolveInitialState()

> **resolveInitialState**\<`B`\>(`boundary`, `context?`): `string`

Defined in: astro/dist/quantize.d.ts:54

Resolve the initial boundary state for server-side rendering.

Priority:
  1. Use viewport width from client hints if available
  2. Estimate viewport from user agent
  3. Fall back to tier-based synthetic value

Evaluates the boundary thresholds to find the matching state.

## Type Parameters

### B

`B` *extends* [`Boundary`](../../type-aliases/Boundary.md)

## Parameters

### boundary

`B`

### context?

[`ServerIslandContext`](../interfaces/ServerIslandContext.md)

## Returns

`string`
