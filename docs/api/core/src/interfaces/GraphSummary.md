[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphSummary

# Interface: GraphSummary

Defined in: [core/src/ai-cast.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L66)

A token-budgeted, deterministic summary of a [DocumentGraph](DocumentGraph.md). Built by
walking the graph in topological order ([linearizeGraph](../functions/linearizeGraph.md)) and emitting
one terse line per node until the budget is spent — so the same graph + same
budget always yields the same summary (and the same content address).

## Properties

### \_tag

> `readonly` **\_tag**: `"GraphSummary"`

Defined in: [core/src/ai-cast.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L67)

***

### base

> `readonly` **base**: `ContentAddress`

Defined in: [core/src/ai-cast.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L69)

The graph this summarizes (its content address).

***

### estimatedTokens

> `readonly` **estimatedTokens**: `number`

Defined in: [core/src/ai-cast.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L73)

Estimated tokens the summary consumes (deterministic estimator).

***

### lines

> `readonly` **lines**: readonly `string`[]

Defined in: [core/src/ai-cast.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L79)

One terse line per included node, in topological order.

***

### nodeCount

> `readonly` **nodeCount**: `number`

Defined in: [core/src/ai-cast.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L77)

Total node count in the graph (so the model knows what was elided).

***

### tokenBudget

> `readonly` **tokenBudget**: `number`

Defined in: [core/src/ai-cast.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L71)

The token budget the summary was cut to.

***

### truncated

> `readonly` **truncated**: `boolean`

Defined in: [core/src/ai-cast.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L75)

Whether nodes were dropped to fit the budget.
