[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphSummary

# Interface: GraphSummary

Defined in: [core/src/ai-cast.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L67)

A token-budgeted, deterministic summary of a [DocumentGraph](DocumentGraph.md). Built by
walking the graph in topological order ([linearizeGraph](../functions/linearizeGraph.md)) and emitting
one terse line per node until the budget is spent — so the same graph + same
budget always yields the same summary (and the same content address).

## Properties

### \_tag

> `readonly` **\_tag**: `"GraphSummary"`

Defined in: [core/src/ai-cast.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L68)

***

### base

> `readonly` **base**: `ContentAddress`

Defined in: [core/src/ai-cast.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L70)

The graph this summarizes (its content address).

***

### estimatedTokens

> `readonly` **estimatedTokens**: `number`

Defined in: [core/src/ai-cast.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L74)

Estimated tokens the summary consumes (deterministic estimator).

***

### lines

> `readonly` **lines**: readonly `string`[]

Defined in: [core/src/ai-cast.ts:80](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L80)

One terse line per included node, in topological order.

***

### nodeCount

> `readonly` **nodeCount**: `number`

Defined in: [core/src/ai-cast.ts:78](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L78)

Total node count in the graph (so the model knows what was elided).

***

### tokenBudget

> `readonly` **tokenBudget**: `number`

Defined in: [core/src/ai-cast.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L72)

The token budget the summary was cut to.

***

### truncated

> `readonly` **truncated**: `boolean`

Defined in: [core/src/ai-cast.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L76)

Whether nodes were dropped to fit the budget.
