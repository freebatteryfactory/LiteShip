[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / resolveInitialStateWithReceipt

# Function: resolveInitialStateWithReceipt()

> **resolveInitialStateWithReceipt**\<`B`\>(`boundary`, `context?`): [`ResolvedInitialState`](../interfaces/ResolvedInitialState.md)

Defined in: [astro/src/quantize.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/quantize.ts#L171)

Like [resolveInitialState](resolveInitialState.md) but carries a `StateResolutionReceipt`
(`@czap/core`) naming which signal drove SSR — client hints, UA estimate,
cap-tier synthetic, or policy (reduced-motion bias).

## Type Parameters

### B

`B` *extends* [`Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>

## Parameters

### boundary

`B`

### context?

[`ServerIslandContext`](../interfaces/ServerIslandContext.md) = `{}`

## Returns

[`ResolvedInitialState`](../interfaces/ResolvedInitialState.md)
