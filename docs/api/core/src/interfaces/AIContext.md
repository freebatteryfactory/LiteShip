[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AIContext

# Interface: AIContext

Defined in: [core/src/ai-cast.ts:110](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L110)

The model-facing context cast OUT of a [DocumentGraph](DocumentGraph.md). Deterministic and
content-addressed (`id` = fnv1a∘CanonicalCbor over the payload, the one repo
kernel) like every other cast. Carries:
 - `summary`: the token-budgeted graph projection,
 - `proposalSchemas`: the output contracts the model may fill (graph-patch
   and/or generated-ui), advertised so the model knows EXACTLY what to return,
 - `systemPrompt`: a deterministic prose framing of the above.

It is INERT: nothing here calls a model. A producer feeds `systemPrompt` +
`proposalSchemas` to whatever model it routes to; the framework only built the
context.

## Properties

### \_tag

> `readonly` **\_tag**: `"AIContext"`

Defined in: [core/src/ai-cast.ts:111](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L111)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/ai-cast.ts:112](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L112)

***

### base

> `readonly` **base**: `ContentAddress`

Defined in: [core/src/ai-cast.ts:116](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L116)

The graph this context speaks for.

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/ai-cast.ts:114](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L114)

Content address of this context (over summary + schemas + prompt).

***

### proposalSchemas

> `readonly` **proposalSchemas**: readonly [`ProposalSchema`](ProposalSchema.md)[]

Defined in: [core/src/ai-cast.ts:118](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L118)

***

### summary

> `readonly` **summary**: [`GraphSummary`](GraphSummary.md)

Defined in: [core/src/ai-cast.ts:117](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L117)

***

### systemPrompt

> `readonly` **systemPrompt**: `string`

Defined in: [core/src/ai-cast.ts:119](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L119)
