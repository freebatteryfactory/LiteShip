[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/astro](../README.md) / resolveInitialStateWithReceipt

# Function: resolveInitialStateWithReceipt()

> **resolveInitialStateWithReceipt**\<`B`\>(`boundary`, `context?`): [`ResolvedInitialState`](../interfaces/ResolvedInitialState.md)

Defined in: astro/dist/quantize.d.ts:60

Like [resolveInitialState](resolveInitialState.md) but carries a `StateResolutionReceipt`
(`@liteship/core`) naming which signal drove SSR — client hints, UA estimate,
cap-tier synthetic, or policy (reduced-motion bias).

## Type Parameters

### B

`B` *extends* [`Boundary`](../../type-aliases/Boundary.md)

## Parameters

### boundary

`B`

### context?

[`ServerIslandContext`](../interfaces/ServerIslandContext.md)

## Returns

[`ResolvedInitialState`](../interfaces/ResolvedInitialState.md)
