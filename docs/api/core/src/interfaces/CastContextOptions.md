[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CastContextOptions

# Interface: CastContextOptions

Defined in: [core/src/authoring/ai-cast.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/ai-cast.ts#L126)

Options for [castContext](../variables/AICast.md#castcontext).

## Properties

### catalog?

> `readonly` `optional` **catalog?**: `ComponentCatalog`

Defined in: [core/src/authoring/ai-cast.ts:140](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/ai-cast.ts#L140)

Host component catalog, REQUIRED when `'generated-ui'` is among the targets:
the advertised GeneratedUITree schema enumerates the catalog's components so
the model proposes only registered names.

***

### targets?

> `readonly` `optional` **targets?**: readonly [`ProposalTarget`](../type-aliases/ProposalTarget.md)[]

Defined in: [core/src/authoring/ai-cast.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/ai-cast.ts#L134)

Which output contracts to advertise to the model. Default: `['graph-patch']`
(the graph-native target). Add `'generated-ui'` when the host also exposes a
component catalog (pass it via [CastContextOptions.catalog](#catalog)).

***

### tokenBudget?

> `readonly` `optional` **tokenBudget?**: `number`

Defined in: [core/src/authoring/ai-cast.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/ai-cast.ts#L128)

Token budget for the embedded graph summary. Default 1024.
