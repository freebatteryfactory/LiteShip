[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CastContextOptions

# Interface: CastContextOptions

Defined in: [core/src/ai-cast.ts:125](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L125)

Options for [castContext](../variables/AICast.md#castcontext).

## Properties

### catalog?

> `readonly` `optional` **catalog?**: `ComponentCatalog`

Defined in: [core/src/ai-cast.ts:139](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L139)

Host component catalog, REQUIRED when `'generated-ui'` is among the targets:
the advertised GeneratedUITree schema enumerates the catalog's components so
the model proposes only registered names.

***

### targets?

> `readonly` `optional` **targets?**: readonly [`ProposalTarget`](../type-aliases/ProposalTarget.md)[]

Defined in: [core/src/ai-cast.ts:133](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L133)

Which output contracts to advertise to the model. Default: `['graph-patch']`
(the graph-native target). Add `'generated-ui'` when the host also exposes a
component catalog (pass it via [CastContextOptions.catalog](#catalog)).

***

### tokenBudget?

> `readonly` `optional` **tokenBudget?**: `number`

Defined in: [core/src/ai-cast.ts:127](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L127)

Token budget for the embedded graph summary. Default 1024.
